import { Context } from "@/trpc/server/init";
import ChatsRepository from "../repositories/chats-repository";
import { Chat, ChatStatus, ChatMessageRole } from "@/types/chat";
import { CandidateCreate } from "@/types/candidate";

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
  ) {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    const formatFileSize = (size: number) => {
      if (size < 1024) return `${size} B`;
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    };

    await ChatsRepository.addMessage(ctx, {
      chatId,
      userId: ctx.user.id,
      content: `Geüpload bestand: ${fileName} (${formatFileSize(fileSize)})`,
      role: ChatMessageRole.User,
    });

    await ChatsRepository.addMessage(ctx, {
      chatId,
      userId: ctx.user.id,
      content: "Oké, probeer het bestand opnieuw te uploaden.",
      role: ChatMessageRole.Assistant,
    });

    await ChatsRepository.updateStatusForUser(ctx, {
      id: chatId,
      userId: ctx.user.id,
      status: ChatStatus.WaitingForCsvInput,
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
  ) {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    await ChatsRepository.addMessage(ctx, {
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
      status: ChatStatus.CsvColumnsMapped,
    });
  }
}
