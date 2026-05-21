import { messages as chatMessages } from "@/lib/chat/messages";
import {
  getChatStatusStep,
  getNextStatusAfterStatusMessage,
} from "@/lib/chat/workflow";
import { Context } from "@/trpc/server/init";
import { ChatMessageRole, ChatMessageType, ChatStatus } from "@/types/chat";
import ChatsRepository from "../repositories/chats-repository";

export type ChatManagerStreamMessage = {
  role: ChatMessageRole.Assistant;
  type: ChatMessageType;
  content: string;
  metadata: Record<string, unknown>;
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
    const type = getMessageTypeForStatus(chat.status);
    const metadata = getMessageMetadataForStatus(chat.status, chatId);
    const hasSentStatusMessage = chat.messages?.some(
      (message) =>
        message.role === ChatMessageRole.Assistant &&
        (isRequestMessageType(type)
          ? message.type === type
          : message.type === type && message.content === content)
    );

    if (hasSentStatusMessage) {
      return { type: "empty" };
    }

    return {
      type: "message",
      message: {
        role: ChatMessageRole.Assistant,
        type,
        content,
        metadata,
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
      type,
      metadata,
      nextStatus,
    }: {
      chatId: string;
      content: string;
      role: ChatMessageRole;
      type: ChatMessageType;
      metadata: Record<string, unknown>;
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
      type,
      metadata,
      nextStatus,
    });
  }
}

function getMessageTypeForStatus(status: ChatStatus): ChatMessageType {
  switch (status) {
    case ChatStatus.NeedsCsvColumnMapping:
      return ChatMessageType.CsvColumnMappingRequest;
    case ChatStatus.CommentRequest:
      return ChatMessageType.CommentRequest;
    case ChatStatus.ClassificationComplete:
    case ChatStatus.Closed:
      return ChatMessageType.EndOfChat;
    default:
      return ChatMessageType.Text;
  }
}

function getMessageMetadataForStatus(
  status: ChatStatus,
  chatId: string
): Record<string, unknown> {
  switch (status) {
    case ChatStatus.NeedsCsvColumnMapping:
      return { answered: false, importId: chatId };
    case ChatStatus.CommentRequest:
      return { answered: false };
    default:
      return {};
  }
}

function isRequestMessageType(type: ChatMessageType) {
  return (
    type === ChatMessageType.CsvUploadRequest ||
    type === ChatMessageType.CsvColumnMappingRequest ||
    type === ChatMessageType.CommentRequest
  );
}
