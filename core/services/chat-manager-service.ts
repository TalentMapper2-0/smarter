import { messages as chatMessages } from "@/lib/chat/messages";
import {
  getChatStatusStep,
  getNextStatusAfterStatusMessage,
} from "@/lib/chat/workflow";
import { Context } from "@/trpc/server/init";
import { ChatMessageRole, ChatStatus } from "@/types/chat";
import ChatsRepository from "../repositories/chats-repository";

export type ChatManagerStreamMessage = {
  role: ChatMessageRole.Assistant;
  content: string;
};

export type ChatManagerStreamPlan =
  | {
      type: "not-found";
    }
  | {
      type: "empty";
    }
  | {
      type: "message";
      message: ChatManagerStreamMessage;
      nextStatus?: ChatStatus;
    };

export default class ChatManagerService {
  static async getNextStreamPlan(
    ctx: Context,
    { chatId }: { chatId: string }
  ): Promise<ChatManagerStreamPlan> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    const chat = await ChatsRepository.findByIdForUser(ctx, {
      id: chatId,
      userId: ctx.user.id,
    });

    if (!chat) {
      return { type: "not-found" };
    }

    const step = getChatStatusStep(chat.status);

    if (!step.messageKey) {
      return { type: "empty" };
    }

    const content = chatMessages[step.messageKey];
    const hasSentStatusMessage = chat.messages?.some(
      (message) =>
        message.role === ChatMessageRole.Assistant &&
        message.content === content
    );

    if (hasSentStatusMessage) {
      return { type: "empty" };
    }

    return {
      type: "message",
      message: {
        role: ChatMessageRole.Assistant,
        content,
      },
      nextStatus: getNextStatusAfterStatusMessage(chat.status),
    };
  }

  static async persistStreamedStep(
    ctx: Context,
    {
      chatId,
      content,
      role,
      nextStatus,
    }: {
      chatId: string;
      content: string;
      role: ChatMessageRole;
      nextStatus?: ChatStatus;
    }
  ) {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    return ChatsRepository.createMessageAndUpdateStatus(ctx, {
      chatId,
      userId: ctx.user.id,
      content,
      role,
      nextStatus,
    });
  }
}
