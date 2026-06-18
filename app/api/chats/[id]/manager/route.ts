import ChatsService from "@/core/services/chats-service";
import { createServerContext } from "@/trpc/server/context";
import "server-only";
import z from "zod";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const chatIdSchema = z.uuid();

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const parsedChatId = chatIdSchema.safeParse(id);

  if (!parsedChatId.success) {
    return new Response("Invalid chat id", { status: 400 });
  }

  const chatId = parsedChatId.data;

  const ctx = await createServerContext();

  if (!ctx.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const chat = await ChatsService.findById(ctx, { id: chatId });

  if (!chat) {
    return new Response("Chat not found", { status: 404 });
  }

  return ChatsService.processTurn(ctx, { input: { chatId } });
}
