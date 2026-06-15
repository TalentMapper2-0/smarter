import { turnHandlers } from "@/lib/chat/handlers";
import { Context } from "@/trpc/server/init";
import {
  Chat,
  ChatMessage,
  ChatMessageRole,
  ChatMessageType,
  ProcessTurnInput
} from "@/types/chat";
import ChatsRepository from "../repositories/chats-repository";

export default class ChatsService {
  static async listRecent(ctx: Context): Promise<Chat[]> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    return ChatsRepository.listRecentForUser(ctx, {
      userId: ctx.user.id,
    });
  }

  static async processTurn(
    ctx: Context,
    { input }: { input: ProcessTurnInput }
  ): Promise<ChatMessage> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    const chat = await ChatsRepository.findById(ctx, input.chatId);

    if (!chat) {
      throw new Error("Chat not found");
    }

    const handler = turnHandlers[chat.status];

    if (!handler) {
      throw new Error(`No handler for chat status ${chat.status}`);
    }

    return handler({ ctx, chat, input });
  }

  static async create(ctx: Context, title: string): Promise<Chat> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    const chat = await ChatsRepository.create(ctx, title);

    return chat;
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
      text: string;
    }
  ): Promise<ChatMessage> {
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

    return ChatsRepository.addMessage(ctx, {
      chatId,
      content: text.trim() || null,
      role: ChatMessageRole.User,
      type: ChatMessageType.AnalysisAttachment,
      metadata: {
        files: files.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
      },
    });
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
}
