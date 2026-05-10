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
