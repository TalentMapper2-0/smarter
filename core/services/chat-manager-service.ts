import { messages as chatMessages } from "@/lib/chat/messages";
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

    switch (chat.status) {
      case ChatStatus.Initialized:
        if ((chat.messages?.length ?? 0) > 0) {
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

    return ChatsRepository.createMessageIfEmptyAndUpdateStatus(ctx, {
      chatId,
      userId: ctx.user.id,
      content,
      role,
      nextStatus,
    });
  }
}
