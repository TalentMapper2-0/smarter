import { Context } from "@/trpc/server/init";
import { Chat, ChatStatus, ProcessTurnInput } from "@/types/chat";

export type TurnHandlerArgs = {
  ctx: Context;
  chat: Chat;
  input?: ProcessTurnInput;
};

export type TurnHandler = (args: TurnHandlerArgs) => Promise<Response>;

export type TurnHandlers = Partial<Record<ChatStatus, TurnHandler>>;