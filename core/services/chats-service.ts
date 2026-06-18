import { Context } from "@/trpc/server/init";
import ChatsRepository from "../repositories/chats-repository";
import {
  Chat,
  ChatMessage,
  ChatStatus,
  ChatMessageRole,
  ChatMessageType,
} from "@/types/chat";
import { CandidateCreate } from "@/types/candidate";
import { messages as chatMessages } from "@/lib/chat/messages";
import { getNextStatusAfterInput } from "@/lib/chat/workflow";
import { parsedEnv } from "@/config/env";

export type AgentChoice = "SourcingAgent" | "AnalysisAgent";

const ANALYSIS_REQUESTED_FIELDS = [
  "seniority",
  "region",
  "must_have_skills",
  "education",
  "company_size",
] as const;

type AnalysisRequestedField = (typeof ANALYSIS_REQUESTED_FIELDS)[number];

export type AnalysisSourceFile = {
  filename?: string;
  mediaType?: string;
  type: "file";
  url: string;
};

type AnalysisSource = {
  source_type: "text" | "url";
  payload: string;
};

type AnalysisAgentResponse = {
  previous_response_id: string;
  target_group: Record<string, unknown> | null;
  summary: string | null;
};

type AnalysisState = {
  previousResponseId: string;
  targetGroup: Record<string, unknown>;
  summary: string | null;
  missingFields: AnalysisRequestedField[];
  currentField: AnalysisRequestedField;
};

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

  static async selectAgent(
    ctx: Context,
    {
      chatId,
      agent,
    }: {
      chatId: string;
      agent: AgentChoice;
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

    if (chat.status !== ChatStatus.Initialized) {
      throw new Error("This chat has already selected an agent.");
    }

    const selectedAgentMessage = await ChatsRepository.addMessage(ctx, {
      chatId,
      userId: ctx.user.id,
      role: ChatMessageRole.User,
      content: agent,
    });

    if (agent === "SourcingAgent") {
      const uploadRequestMessage =
        await ChatsRepository.createMessageAndUpdateStatus(ctx, {
          chatId,
          userId: ctx.user.id,
          role: ChatMessageRole.Assistant,
          type: ChatMessageType.CsvUploadRequest,
          content: chatMessages.chatInitialized,
          metadata: {
            answered: false,
          },
          nextStatus: ChatStatus.WaitingForCsvInput,
        });

      return {
        messages: [
          selectedAgentMessage,
          ...(uploadRequestMessage ? [uploadRequestMessage] : []),
        ],
        status: ChatStatus.WaitingForCsvInput,
      };
    }

    const analysisSelectedMessage = await ChatsRepository.addMessage(ctx, {
      chatId,
      userId: ctx.user.id,
      role: ChatMessageRole.Assistant,
      content: chatMessages.analysisAgentSelected,
    });

    const sourcesRequestMessage =
      await ChatsRepository.createMessageAndUpdateStatus(ctx, {
        chatId,
        userId: ctx.user.id,
        role: ChatMessageRole.Assistant,
        type: ChatMessageType.Text,
        content: chatMessages.analysisSourcesRequest,
        nextStatus: ChatStatus.WaitingForAnalysisSources,
      });

    return {
      messages: [
        selectedAgentMessage,
        analysisSelectedMessage,
        ...(sourcesRequestMessage ? [sourcesRequestMessage] : []),
      ],
      status: ChatStatus.WaitingForAnalysisSources,
    };
  }

  static async submitAnalysisSources(
    ctx: Context,
    {
      chatId,
      text,
      files,
    }: {
      chatId: string;
      text: string;
      files: AnalysisSourceFile[];
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

    if (chat.status !== ChatStatus.WaitingForAnalysisSources) {
      throw new Error("This chat is not waiting for analysis sources.");
    }

    const sources = buildAnalysisSources(text);
    const pdfFiles = files.filter(isPdfSourceFile);

    if (!sources.length && !pdfFiles.length) {
      throw new Error("Provide text, a URL, or a PDF file to analyze.");
    }

    const userMessage = await ChatsRepository.addMessage(ctx, {
      chatId,
      userId: ctx.user.id,
      role: ChatMessageRole.User,
      content: formatAnalysisUserContent(text, pdfFiles),
    });

    const response = await callAnalysisAgent({
      sources,
      files: pdfFiles,
    });
    const targetGroup = normalizeTargetGroup(response.target_group);
    const missingFields = getMissingAnalysisFields(targetGroup);

    if (missingFields.length) {
      const currentField = missingFields[0];
      const requestMessage = await ChatsRepository.createMessageAndUpdateStatus(
        ctx,
        {
          chatId,
          userId: ctx.user.id,
          role: ChatMessageRole.Assistant,
          type: ChatMessageType.Text,
          content: getAnalysisFieldPrompt(currentField),
          metadata: {
            analysis: {
              previousResponseId: response.previous_response_id,
              targetGroup,
              summary: response.summary,
              missingFields,
              currentField,
            } satisfies AnalysisState,
          },
          nextStatus: ChatStatus.WaitingForAnalysisField,
        }
      );

      return {
        messages: [userMessage, ...(requestMessage ? [requestMessage] : [])],
        status: ChatStatus.WaitingForAnalysisField,
      };
    }

    console.log("Analysis target group ready for database", {
      chatId,
      previousResponseId: response.previous_response_id,
      targetGroup,
      summary: response.summary,
    });

    const completeMessage = await ChatsRepository.addMessage(ctx, {
      chatId,
      userId: ctx.user.id,
      role: ChatMessageRole.Assistant,
      content: formatAnalysisCompleteMessage(response.summary),
    });

    const endMessage = await ChatsRepository.createMessageAndUpdateStatus(ctx, {
      chatId,
      userId: ctx.user.id,
      role: ChatMessageRole.Assistant,
      type: ChatMessageType.EndOfChat,
      content: chatMessages.chatClosed,
      nextStatus: ChatStatus.Closed,
    });

    return {
      messages: [
        userMessage,
        completeMessage,
        ...(endMessage ? [endMessage] : []),
      ],
      status: ChatStatus.Closed,
    };
  }

  static async saveAnalysisField(
    ctx: Context,
    {
      chatId,
      value,
    }: {
      chatId: string;
      value: string;
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

    if (chat.status !== ChatStatus.WaitingForAnalysisField) {
      throw new Error("This chat is not waiting for an analysis field.");
    }

    const analysisState = getLatestAnalysisState(chat);

    if (!analysisState) {
      throw new Error("No analysis field request found.");
    }

    const trimmedValue = value.trim();

    if (!trimmedValue) {
      throw new Error("Analysis field value cannot be empty.");
    }

    const userMessage = await ChatsRepository.addMessage(ctx, {
      chatId,
      userId: ctx.user.id,
      role: ChatMessageRole.User,
      content: trimmedValue,
    });
    const targetGroup = {
      ...analysisState.targetGroup,
      [analysisState.currentField]: trimmedValue,
    };
    const missingFields = analysisState.missingFields.filter(
      (field) => field !== analysisState.currentField
    );

    if (missingFields.length) {
      const currentField = missingFields[0];
      const requestMessage = await ChatsRepository.createMessageAndUpdateStatus(
        ctx,
        {
          chatId,
          userId: ctx.user.id,
          role: ChatMessageRole.Assistant,
          type: ChatMessageType.Text,
          content: getAnalysisFieldPrompt(currentField),
          metadata: {
            analysis: {
              ...analysisState,
              targetGroup,
              missingFields,
              currentField,
            } satisfies AnalysisState,
          },
          nextStatus: ChatStatus.WaitingForAnalysisField,
        }
      );

      return {
        messages: [userMessage, ...(requestMessage ? [requestMessage] : [])],
        status: ChatStatus.WaitingForAnalysisField,
      };
    }

    console.log("Analysis target group ready for database", {
      chatId,
      previousResponseId: analysisState.previousResponseId,
      targetGroup,
      summary: analysisState.summary,
    });

    const completeMessage = await ChatsRepository.addMessage(ctx, {
      chatId,
      userId: ctx.user.id,
      role: ChatMessageRole.Assistant,
      content: formatAnalysisCompleteMessage(analysisState.summary),
    });

    const endMessage = await ChatsRepository.createMessageAndUpdateStatus(ctx, {
      chatId,
      userId: ctx.user.id,
      role: ChatMessageRole.Assistant,
      type: ChatMessageType.EndOfChat,
      content: chatMessages.chatClosed,
      nextStatus: ChatStatus.Closed,
    });

    return {
      messages: [
        userMessage,
        completeMessage,
        ...(endMessage ? [endMessage] : []),
      ],
      status: ChatStatus.Closed,
    };
  }

  static async completeSourcingFlow(
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
      throw new Error("This chat is not ready to complete.");
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

function buildAnalysisSources(text: string): AnalysisSource[] {
  const urls = extractUrls(text);
  const textWithoutUrls = urls
    .reduce((currentText, url) => currentText.replace(url, " "), text)
    .replace(/\s+/g, " ")
    .trim();
  const sources: AnalysisSource[] = [];

  if (textWithoutUrls) {
    sources.push({
      source_type: "text",
      payload: textWithoutUrls,
    });
  }

  for (const url of urls) {
    sources.push({
      source_type: "url",
      payload: url,
    });
  }

  return sources;
}

function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const match of matches) {
    const url = match.replace(/[),.;!?]+$/g, "");

    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }

  return urls;
}

function isPdfSourceFile(file: AnalysisSourceFile) {
  return (
    file.mediaType === "application/pdf" ||
    file.filename?.toLowerCase().endsWith(".pdf") === true
  );
}

function formatAnalysisUserContent(text: string, files: AnalysisSourceFile[]) {
  const trimmedText = text.trim();
  const fileNames = files
    .map((file) => file.filename)
    .filter((filename): filename is string => Boolean(filename));

  if (!fileNames.length) {
    return trimmedText;
  }

  const attachmentLine = `Bijlagen: ${fileNames.join(", ")}`;

  return trimmedText ? `${trimmedText}\n\n${attachmentLine}` : attachmentLine;
}

async function callAnalysisAgent({
  sources,
  files,
}: {
  sources: AnalysisSource[];
  files: AnalysisSourceFile[];
}): Promise<AnalysisAgentResponse> {
  const payload = {
    sources,
    requested_fields: ANALYSIS_REQUESTED_FIELDS,
  };
  const formData = new FormData();
  formData.set("service_name", "Analysis_Agent");
  formData.set("payload", JSON.stringify(payload));

  for (const file of files) {
    const blob = dataUrlToBlob(file.url, file.mediaType ?? "application/pdf");
    formData.append("files", blob, file.filename ?? "analysis-source.pdf");
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

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(
      `Orchestrator analysis failed with ${response.status}: ${responseText}`
    );
  }

  return parseAnalysisAgentResponse(await response.text());
}

function dataUrlToBlob(dataUrl: string, fallbackMediaType: string) {
  if (!dataUrl.startsWith("data:")) {
    return new Blob([], { type: fallbackMediaType });
  }

  const [header, data = ""] = dataUrl.split(",", 2);
  const mediaType = header.match(/^data:([^;]+)/)?.[1] ?? fallbackMediaType;
  const isBase64 = header.includes(";base64");
  const binary = isBase64
    ? Buffer.from(data, "base64").toString("binary")
    : decodeURIComponent(data);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mediaType });
}

function parseAnalysisAgentResponse(
  responseText: string
): AnalysisAgentResponse {
  const parsedCandidates = parseJsonLikeResponses(responseText);
  const response = findAnalysisResponse(parsedCandidates);

  if (!response) {
    console.warn("Analysis response did not contain expected keys", {
      topLevelKeys: parsedCandidates
        .filter(isRecord)
        .map((candidate) => Object.keys(candidate)),
    });
    throw new Error("Invalid analysis response.");
  }

  const previousResponseId =
    response.previous_response_id ??
    response.previousResponseId ??
    response.response_id ??
    response.responseId ??
    response.id ??
    "";
  const targetGroup = response.target_group;
  const summary = response.summary;

  if (typeof previousResponseId !== "string") {
    throw new Error("Analysis response is missing previous_response_id.");
  }

  if (
    targetGroup !== null &&
    (!targetGroup ||
      typeof targetGroup !== "object" ||
      Array.isArray(targetGroup))
  ) {
    throw new Error("Analysis response has an invalid target_group.");
  }

  if (
    summary !== null &&
    typeof summary !== "string" &&
    summary !== undefined
  ) {
    throw new Error("Analysis response has an invalid summary.");
  }

  return {
    previous_response_id: previousResponseId,
    target_group: targetGroup as Record<string, unknown> | null,
    summary: typeof summary === "string" ? summary : null,
  };
}

function parseJsonLikeResponses(responseText: string): unknown[] {
  const candidates: unknown[] = [];

  try {
    candidates.push(JSON.parse(responseText));
  } catch {
    // Keep collecting below from event blocks and individual JSON lines.
  }

  const eventBlocks = responseText.split(/\r?\n\r?\n/);

  for (const eventBlock of eventBlocks) {
    const dataText = eventBlock
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(
        (line) => line && !line.startsWith("event:") && !line.startsWith(":")
      )
      .map((line) =>
        line.startsWith("data:") ? line.slice("data:".length).trim() : line
      )
      .join("\n")
      .trim();

    if (!dataText || dataText === "[DONE]") {
      continue;
    }

    try {
      candidates.push(JSON.parse(dataText));
    } catch {
      continue;
    }
  }

  for (const line of responseText.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    const jsonText = trimmedLine.startsWith("data:")
      ? trimmedLine.slice("data:".length).trim()
      : trimmedLine;

    if (!jsonText || jsonText === "[DONE]") {
      continue;
    }

    try {
      candidates.push(JSON.parse(jsonText));
    } catch {
      continue;
    }
  }

  return candidates;
}

function findAnalysisResponse(
  candidates: unknown[]
): Record<string, unknown> | null {
  for (const candidate of [...candidates].reverse()) {
    const response = findAnalysisResponseInValue(candidate);

    if (response) {
      return response;
    }
  }

  return null;
}

function findAnalysisResponseInValue(
  value: unknown
): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      return findAnalysisResponseInValue(JSON.parse(value));
    } catch {
      return null;
    }
  }

  if (!isRecord(value)) {
    return null;
  }

  if (
    "target_group" in value ||
    "previous_response_id" in value ||
    "previousResponseId" in value
  ) {
    return value;
  }

  for (const nestedValue of Object.values(value)) {
    const response = findAnalysisResponseInValue(nestedValue);

    if (response) {
      return response;
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeTargetGroup(targetGroup: Record<string, unknown> | null) {
  if (!targetGroup) {
    return Object.fromEntries(
      ANALYSIS_REQUESTED_FIELDS.map((field) => [field, null])
    );
  }

  return Object.fromEntries(
    ANALYSIS_REQUESTED_FIELDS.map((field) => [
      field,
      targetGroup[field] ?? null,
    ])
  );
}

function getMissingAnalysisFields(targetGroup: Record<string, unknown>) {
  return ANALYSIS_REQUESTED_FIELDS.filter((field) => {
    const value = targetGroup[field];

    if (value === null || value === undefined) {
      return true;
    }

    if (typeof value === "string") {
      return value.trim().length === 0;
    }

    if (Array.isArray(value)) {
      return value.length === 0;
    }

    return false;
  });
}

function getAnalysisFieldPrompt(field: AnalysisRequestedField) {
  return `Ik mis nog ${formatAnalysisFieldLabel(field)}. Kun je dat invullen?`;
}

function formatAnalysisFieldLabel(field: AnalysisRequestedField) {
  const labels = {
    seniority: "seniority",
    region: "regio",
    must_have_skills: "must-have skills",
    education: "opleiding",
    company_size: "bedrijfsgrootte",
  } satisfies Record<AnalysisRequestedField, string>;

  return labels[field];
}

function formatAnalysisCompleteMessage(summary: string | null) {
  return summary
    ? `${chatMessages.analysisComplete}\n\n${summary}`
    : chatMessages.analysisComplete;
}

function getLatestAnalysisState(chat: Chat): AnalysisState | null {
  const messages = [...(chat.messages ?? [])].reverse();

  for (const message of messages) {
    if (message.type !== ChatMessageType.Text) {
      continue;
    }

    const analysis = message.metadata.analysis;

    if (isAnalysisState(analysis)) {
      return analysis;
    }
  }

  return null;
}

function isAnalysisState(value: unknown): value is AnalysisState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const state = value as Record<string, unknown>;

  return (
    typeof state.previousResponseId === "string" &&
    state.targetGroup !== null &&
    typeof state.targetGroup === "object" &&
    !Array.isArray(state.targetGroup) &&
    (typeof state.summary === "string" || state.summary === null) &&
    Array.isArray(state.missingFields) &&
    state.missingFields.every(isAnalysisRequestedField) &&
    isAnalysisRequestedField(state.currentField)
  );
}

function isAnalysisRequestedField(
  value: unknown
): value is AnalysisRequestedField {
  return ANALYSIS_REQUESTED_FIELDS.includes(value as AnalysisRequestedField);
}
