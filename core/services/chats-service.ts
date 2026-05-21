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

export type AgentChoice = "SourcingAgent" | "AnalysisAgent";

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
        selectedAgentMessage,
        analysisSelectedMessage,
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
