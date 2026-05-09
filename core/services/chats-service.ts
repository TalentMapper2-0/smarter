import { Context } from "@/trpc/server/init";
import ChatsRepository from "../repositories/chats-repository";
import { Chat, ChatMessage, ChatStatus, ChatMessageRole } from "@/types/chat";
import { CandidateCreate } from "@/types/candidate";
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

    void fileName;
    void fileSize;

    return ChatsRepository.addMessage(ctx, {
      chatId,
      userId: ctx.user.id,
      content: null,
      role: ChatMessageRole.User,
      file: {
        name: fileName,
        size: fileSize,
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

    return ChatsRepository.addMessage(ctx, {
      chatId,
      userId: ctx.user.id,
      role: ChatMessageRole.User,
      content: null,
      file: {
        name: fileName,
        size: fileSize,
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
    }: {
      chatId: string;
      wantsComment: boolean;
    }
  ): Promise<ChatMessage> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    const nextStatus = wantsComment
      ? ChatStatus.WaitingForComment
      : ChatStatus.ReadyToClassify;

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
