import { messages as chatMessages, type MessageKey } from "@/lib/chat/messages";
import { Context } from "@/trpc/server/init";
import { ChatMessageRole, ChatStatus } from "@/types/chat";
import ChatsRepository from "../repositories/chats-repository";

export type ChatManagerStreamMessage = {
  role: ChatMessageRole.Assistant;
  content: string;
};

type StreamRequest = {
  messageKey?: MessageKey;
  nextStatus?: ChatStatus;
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
    { chatId, messageKey, nextStatus }: { chatId: string } & StreamRequest
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

    if (messageKey) {
      const content = chatMessages[messageKey];

      if (!content) {
        return { type: "empty" };
      }

      return {
        type: "message",
        message: {
          role: ChatMessageRole.Assistant,
          content,
        },
        nextStatus,
      };
    }

    switch (chat.status) {
      case ChatStatus.Initialized:
        if (
          chat.messages?.some(
            (message) =>
              message.role === ChatMessageRole.Assistant &&
              message.content === chatMessages.chatInitialized
          )
        ) {
          return { type: "empty" };
        }

        return {
          type: "message",
          message: {
            role: ChatMessageRole.Assistant,
            content: chatMessages.chatInitialized,
          },
          nextStatus: ChatStatus.WaitingForCsvInput,
        };

      case ChatStatus.WaitingForCsvInput:
      case ChatStatus.MappingCsvColumns:
      case ChatStatus.NeedsCsvColumnMapping:
      case ChatStatus.WaitingForVacancy:
      case ChatStatus.WaitingForComment:
        return { type: "empty" };

      default:
        return { type: "empty" };
    }
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
