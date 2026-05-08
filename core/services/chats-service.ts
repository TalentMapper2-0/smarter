import { Context } from "@/trpc/server/init";
import ChatsRepository from "../repositories/chats-repository";
import { Chat } from "@/types/chat";

export default class ChatsService {
  static async create(ctx: Context, title: string): Promise<Chat> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    const chat = await ChatsRepository.create(ctx, title);

    return chat;
  }

  static async findById(ctx: Context, { id }: { id: string }): Promise<Chat | null> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    return ChatsRepository.findByIdForUser(ctx, {
      id,
      userId: ctx.user.id,
    });
  }
}
