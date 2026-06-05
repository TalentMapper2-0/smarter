import { Context } from "@/trpc/server/init";
import ChatsRepository from "../repositories/chats-repository";
import {
  AnalysisFieldKey,
  AnalysisFields,
  Chat,
  ChatMessage,
  ChatStatus,
  ChatMessageRole,
  ChatMessageType,
} from "@/types/chat";
import { CandidateCreate } from "@/types/candidate";
import { messages as chatMessages } from "@/lib/chat/messages";
import { getNextStatusAfterInput } from "@/lib/chat/workflow";
import {
  formatAnalysisFieldList,
  formatAnalysisHandoff,
  getMissingAnalysisFields,
  mergeAnalysisFields,
  normalizeAnalysisAgentResult,
  requestedAnalysisFields,
} from "@/lib/chat/analysis";
import { parsedEnv } from "@/config/env";

export default class ChatsService {
  static async create(ctx: Context, title: string): Promise<Chat> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    const chat = await ChatsRepository.create(ctx, title);

    return chat;
  }

  static async findById(
    ctx: Context,
    { id }: { id: string }
  ): Promise<Chat | null> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    return ChatsRepository.findByIdForUser(ctx, {
      id,
      userId: ctx.user.id,
    });
  }

  static async updateStatus(
    ctx: Context,
    { id, status }: { id: string; status: ChatStatus }
  ): Promise<Chat | null> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    return ChatsRepository.updateStatusForUser(ctx, {
      id,
      userId: ctx.user.id,
      status,
    });
  }

  static async listRecent(ctx: Context): Promise<Chat[]> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    return ChatsRepository.listRecentForUser(ctx, {
      userId: ctx.user.id,
    });
  }

  static async submitAnalysisDocuments(
    ctx: Context,
    {
      chatId,
      files,
      text,
    }: {
      chatId: string;
      files: File[];
      text?: string;
    }
  ): Promise<{ messages: ChatMessage[]; status: ChatStatus }> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    const chat = await ChatsRepository.findByIdForUser(ctx, {
      id: chatId,
      userId: ctx.user.id,
    });

    if (!chat) {
      throw new Error("Chat not found");
    }

    if (
      chat.status !== ChatStatus.WaitingForAnalysisInput &&
      chat.status !== ChatStatus.Initialized
    ) {
      throw new Error("This chat is not ready for analysis documents.");
    }

    await ChatsRepository.updateLatestMessageMetadataByType(ctx, {
      chatId,
      userId: ctx.user.id,
      type: ChatMessageType.AnalysisUploadRequest,
      metadata: {
        answered: true,
      },
    });

    const trimmedText = text?.trim() ?? "";
    const attachmentMessage = await ChatsRepository.addMessage(ctx, {
      chatId,
      userId: ctx.user.id,
      role: ChatMessageRole.User,
      content: trimmedText || null,
      type: ChatMessageType.AnalysisAttachment,
      metadata: {
        files: files.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
        ...(trimmedText ? { prompt: trimmedText } : {}),
      },
    });

    await ChatsRepository.updateStatusForUser(ctx, {
      id: chatId,
      userId: ctx.user.id,
      status: ChatStatus.AnalyzingDocuments,
    });

    const analysisResult = await runAnalysisAgent({
      files,
      previousResponseId: null,
      text: trimmedText,
    });

    return persistAnalysisResult(ctx, {
      chatId,
      fields: analysisResult.fields,
      messages: [attachmentMessage],
      previousFields: {},
      previousResponseId: analysisResult.previousResponseId,
      userId: ctx.user.id,
    });
  }

  static async continueAnalysis(
    ctx: Context,
    { chatId, text }: { chatId: string; text: string }
  ): Promise<{ messages: ChatMessage[]; status: ChatStatus }> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    const chat = await ChatsRepository.findByIdForUser(ctx, {
      id: chatId,
      userId: ctx.user.id,
    });

    if (!chat) {
      throw new Error("Chat not found");
    }

    if (chat.status !== ChatStatus.NeedsAnalysisFields) {
      throw new Error("This chat is not waiting for analysis fields.");
    }

    const previousState = getLatestAnalysisState(chat.messages ?? []);

    await ChatsRepository.updateLatestMessageMetadataByType(ctx, {
      chatId,
      userId: ctx.user.id,
      type: ChatMessageType.AnalysisFieldRequest,
      metadata: {
        answered: true,
        extractedFields: previousState.fields,
        fields: previousState.missingFields,
        previousResponseId: previousState.previousResponseId,
      },
    });

    const userMessage = await ChatsRepository.addMessage(ctx, {
      chatId,
      userId: ctx.user.id,
      role: ChatMessageRole.User,
      content: text,
    });

    await ChatsRepository.updateStatusForUser(ctx, {
      id: chatId,
      userId: ctx.user.id,
      status: ChatStatus.AnalyzingDocuments,
    });

    const analysisResult = await runAnalysisAgent({
      previousResponseId: previousState.previousResponseId,
      text,
    });

    return persistAnalysisResult(ctx, {
      chatId,
      fields: analysisResult.fields,
      messages: [userMessage],
      previousFields: previousState.fields,
      previousResponseId:
        analysisResult.previousResponseId ?? previousState.previousResponseId,
      userId: ctx.user.id,
    });
  }

  static async completeSourcingStage(
    ctx: Context,
    { chatId }: { chatId: string }
  ): Promise<{ messages: ChatMessage[]; status: ChatStatus }> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    const chat = await ChatsRepository.findByIdForUser(ctx, {
      id: chatId,
      userId: ctx.user.id,
    });

    if (!chat) {
      throw new Error("Chat not found");
    }

    if (
      chat.status !== ChatStatus.ClassifyingCandidates &&
      chat.status !== ChatStatus.ClassificationComplete
    ) {
      throw new Error("This chat is not ready to complete the sourcing stage.");
    }

    const hasEndMessage = chat.messages?.some(
      (message) =>
        message.role === ChatMessageRole.Assistant &&
        message.type === ChatMessageType.EndOfChat &&
        message.content === chatMessages.chatClosed
    );

    await ChatsRepository.updateStatusForUser(ctx, {
      id: chatId,
      userId: ctx.user.id,
      status: ChatStatus.ClassificationComplete,
    });

    if (hasEndMessage) {
      return {
        messages: [],
        status: ChatStatus.ClassificationComplete,
      };
    }

    const endMessage = await ChatsRepository.addMessage(ctx, {
      chatId,
      userId: ctx.user.id,
      role: ChatMessageRole.Assistant,
      type: ChatMessageType.EndOfChat,
      content: chatMessages.chatClosed,
    });

    return {
      messages: [endMessage],
      status: ChatStatus.ClassificationComplete,
    };
  }

  static async reuploadCsv(
    ctx: Context,
    {
      chatId,
    }: {
      chatId: string;
      fileName: string;
      fileSize: number;
    }
  ): Promise<ChatMessage> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    return ChatsRepository.addMessage(ctx, {
      chatId,
      userId: ctx.user.id,
      content: chatMessages.chatInitialized,
      role: ChatMessageRole.Assistant,
      type: ChatMessageType.CsvUploadRequest,
      metadata: {
        answered: false,
      },
    });
  }

  static async uploadCsvMetadata(
    ctx: Context,
    {
      chatId,
      fileName,
      fileSize,
    }: {
      chatId: string;
      fileName: string;
      fileSize: number;
    }
  ): Promise<ChatMessage> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    await ChatsRepository.updateLatestMessageMetadataByType(ctx, {
      chatId,
      userId: ctx.user.id,
      type: ChatMessageType.CsvUploadRequest,
      metadata: {
        answered: true,
      },
    });

    return ChatsRepository.addMessage(ctx, {
      chatId,
      userId: ctx.user.id,
      role: ChatMessageRole.User,
      content: null,
      type: ChatMessageType.CsvFile,
      metadata: {
        fileName,
        fileSize,
      },
    });
  }
  static async saveMappedCsv(
    ctx: Context,
    {
      chatId,
      mappedRows,
    }: {
      chatId: string;
      fileName: string;
      fileSize: number;
      mappedRows: CandidateCreate[];
    }
  ) {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    await ChatsRepository.saveChatCandidates(ctx, {
      chatId,
      userId: ctx.user.id,
      candidates: mappedRows,
    });

    await ChatsRepository.updateLatestMessageMetadataByType(ctx, {
      chatId,
      userId: ctx.user.id,
      type: ChatMessageType.CsvColumnMappingRequest,
      metadata: {
        answered: true,
        importId: chatId,
      },
    });

    await ChatsRepository.updateStatusForUser(ctx, {
      id: chatId,
      userId: ctx.user.id,
      status:
        getNextStatusAfterInput(ChatStatus.NeedsCsvColumnMapping) ??
        ChatStatus.Closed,
    });
  }

  static async saveVacancy(
    ctx: Context,
    {
      chatId,
      vacancyText,
    }: {
      chatId: string;
      vacancyText: string;
    }
  ): Promise<ChatMessage> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    const message = await ChatsRepository.addMessage(ctx, {
      chatId,
      userId: ctx.user.id,
      role: ChatMessageRole.User,
      content: vacancyText,
    });

    await ChatsRepository.saveVacancy(ctx, {
      chatId,
      vacancyText,
    });

    await ChatsRepository.updateStatusForUser(ctx, {
      id: chatId,
      userId: ctx.user.id,
      status:
        getNextStatusAfterInput(ChatStatus.WaitingForVacancy) ??
        ChatStatus.Closed,
    });

    return message;
  }

  static async saveComment(
    ctx: Context,
    {
      chatId,
      commentText,
    }: {
      chatId: string;
      commentText: string;
    }
  ): Promise<ChatMessage> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    const message = await ChatsRepository.addMessage(ctx, {
      chatId,
      userId: ctx.user.id,
      role: ChatMessageRole.User,
      content: commentText,
    });

    await ChatsRepository.saveComment(ctx, {
      chatId,
      commentText,
    });

    await ChatsRepository.updateStatusForUser(ctx, {
      id: chatId,
      userId: ctx.user.id,
      status:
        getNextStatusAfterInput(ChatStatus.WaitingForComment) ??
        ChatStatus.Closed,
    });

    return message;
  }

  static async confirmComment(
    ctx: Context,
    {
      chatId,
      wantsComment,
      messageId,
    }: {
      chatId: string;
      wantsComment: boolean;
      messageId?: string;
    }
  ): Promise<ChatMessage> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    const nextStatus = wantsComment
      ? ChatStatus.WaitingForComment
      : ChatStatus.ReadyToClassify;

    const answeredMetadata = {
      answered: true,
      answer: wantsComment,
    };

    const updatedRequest = messageId
      ? await ChatsRepository.updateMessageMetadata(ctx, {
          chatId,
          userId: ctx.user.id,
          messageId,
          type: ChatMessageType.CommentRequest,
          metadata: answeredMetadata,
        })
      : null;

    if (!updatedRequest) {
      await ChatsRepository.updateLatestMessageMetadataByType(ctx, {
        chatId,
        userId: ctx.user.id,
        type: ChatMessageType.CommentRequest,
        metadata: answeredMetadata,
      });
    }

    const message = await ChatsRepository.addMessage(ctx, {
      chatId,
      userId: ctx.user.id,
      role: ChatMessageRole.User,
      content: wantsComment ? "Ja" : "Nee",
    });

    await ChatsRepository.updateStatusForUser(ctx, {
      id: chatId,
      userId: ctx.user.id,
      status: nextStatus,
    });

    return message;
  }
}

type RunAnalysisAgentInput = {
  files?: File[];
  previousResponseId: string | null;
  text?: string;
};

type PersistAnalysisResultInput = {
  chatId: string;
  fields: AnalysisFields;
  messages: ChatMessage[];
  previousFields: AnalysisFields;
  previousResponseId: string | null;
  userId: string;
};

type LatestAnalysisState = {
  fields: AnalysisFields;
  missingFields: AnalysisFieldKey[];
  previousResponseId: string | null;
};

async function runAnalysisAgent({
  files = [],
  previousResponseId,
  text,
}: RunAnalysisAgentInput) {
  const sources = text?.trim()
    ? [
        {
          source_type: "text",
          payload: text.trim(),
        },
      ]
    : [];
  const payload = {
    sources,
    requested_fields: requestedAnalysisFields,
    previous_response_id: previousResponseId,
  };
  const formData = new FormData();
  formData.set("service_name", "Analysis_Agent");
  formData.set("payload", JSON.stringify(payload));

  for (const file of files) {
    formData.append("files", file, file.name);
  }

  const response = await fetch(`${parsedEnv.ORCHESTRATOR_URL}/orchestrate`, {
    method: "POST",
    headers: {
      Accept: "text/event-stream, application/json, text/plain",
      Authorization: `Bearer ${parsedEnv.ORCHESTRATOR_API_KEY}`,
      "x-api-key": parsedEnv.ORCHESTRATOR_API_KEY,
    },
    body: formData,
  });

  const responseValue = await readOrchestratorResponse(response);

  if (!response.ok) {
    throw new Error(
      `Orchestrator analysis failed with ${response.status}: ${JSON.stringify(
        responseValue
      )}`
    );
  }

  return normalizeAnalysisAgentResult(responseValue);
}

async function persistAnalysisResult(
  ctx: Context,
  {
    chatId,
    fields,
    messages,
    previousFields,
    previousResponseId,
    userId,
  }: PersistAnalysisResultInput
): Promise<{ messages: ChatMessage[]; status: ChatStatus }> {
  const mergedFields = mergeAnalysisFields(previousFields, fields);
  const missingFields = getMissingAnalysisFields(mergedFields);

  if (missingFields.length) {
    const missingFieldMessage =
      await ChatsRepository.createMessageAndUpdateStatus(ctx, {
        chatId,
        userId,
        role: ChatMessageRole.Assistant,
        type: ChatMessageType.AnalysisFieldRequest,
        content: `Ik mis nog: ${formatAnalysisFieldList(
          missingFields
        )}. Vul die aan in de chat.`,
        metadata: {
          answered: false,
          extractedFields: mergedFields,
          fields: missingFields,
          previousResponseId,
        },
        nextStatus: ChatStatus.NeedsAnalysisFields,
      });

    return {
      messages: [
        ...messages,
        ...(missingFieldMessage ? [missingFieldMessage] : []),
      ],
      status: ChatStatus.NeedsAnalysisFields,
    };
  }

  const handoffMessage = await ChatsRepository.createMessageAndUpdateStatus(
    ctx,
    {
      chatId,
      userId,
      role: ChatMessageRole.Assistant,
      type: ChatMessageType.AnalysisResult,
      content: formatAnalysisHandoff(mergedFields, previousResponseId),
      metadata: {
        fields: mergedFields,
        missingFields,
        previousResponseId,
      },
      nextStatus: ChatStatus.WaitingForCsvInput,
    }
  );

  return {
    messages: [...messages, ...(handoffMessage ? [handoffMessage] : [])],
    status: ChatStatus.WaitingForCsvInput,
  };
}

function getLatestAnalysisState(messages: ChatMessage[]): LatestAnalysisState {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (
      message.type === ChatMessageType.AnalysisFieldRequest ||
      message.type === ChatMessageType.AnalysisResult
    ) {
      if (message.type === ChatMessageType.AnalysisFieldRequest) {
        return {
          fields: message.metadata.extractedFields,
          missingFields: message.metadata.fields,
          previousResponseId: message.metadata.previousResponseId,
        };
      }

      return {
        fields: message.metadata.fields,
        missingFields: message.metadata.missingFields,
        previousResponseId: message.metadata.previousResponseId,
      };
    }
  }

  return {
    fields: {},
    missingFields: [...requestedAnalysisFields],
    previousResponseId: null,
  };
}

async function readOrchestratorResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  const directJson = parseJson(text);

  if (directJson !== undefined) {
    return directJson;
  }

  const parsedLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^data:\s*/, ""))
    .map(parseJson)
    .filter((value) => value !== undefined);

  return parsedLines.at(-1) ?? text;
}

function parseJson(value: string): unknown | undefined {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}
