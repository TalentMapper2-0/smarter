import { ChatMessage, ChatMessageRole, ChatMessageType } from "@/types/chat";

export type DbMessageRow = {
  id: string;
  chat_id: string | null;
  role: string;
  type: string;
  content: string | null;
  created_at: string;
  meta_data: unknown;
};

export type ChatMessageInsert = {
  chatId: string;
  role: ChatMessageRole;
  type: ChatMessageType;
  content: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
};

export type DbMessageInsert = {
  chat_id: string;
  role: ChatMessageRole;
  type: ChatMessageType;
  content: string | null;
  meta_data: Record<string, unknown>;
  created_at?: string;
};

export function mapDbMessageToChatMessage(row: DbMessageRow): ChatMessage {
  const type = toChatMessageType(row.type);
  const role = toChatMessageRole(row.role);
  const metadata = toMetadataRecord(row.meta_data);
  const base = {
    id: row.id,
    chatId: row.chat_id ?? "",
    role,
    type,
    content: row.content,
    createdAt: row.created_at,
  };

  switch (type) {
    case ChatMessageType.CsvFile:
      return {
        ...base,
        type,
        metadata: {
          fileName:
            typeof metadata.fileName === "string" ? metadata.fileName : "",
          fileSize:
            typeof metadata.fileSize === "number" ? metadata.fileSize : 0,
        },
      };

    case ChatMessageType.CsvColumnMappingRequest:
      return {
        ...base,
        type,
        metadata: {
          answered: metadata.answered === true,
          importId:
            typeof metadata.importId === "string" ? metadata.importId : "",
        },
      };

    case ChatMessageType.CommentRequest:
      return {
        ...base,
        type,
        metadata: {
          answered: metadata.answered === true,
          ...(typeof metadata.answer === "boolean"
            ? { answer: metadata.answer }
            : {}),
        },
      };

    case ChatMessageType.ClassificationResult:
      return {
        ...base,
        type,
        metadata: {
          runId: typeof metadata.runId === "string" ? metadata.runId : "",
        },
      };

    case ChatMessageType.CsvUploadRequest:
      return {
        ...base,
        type,
        metadata: {
          answered: metadata.answered === true,
        },
      };

    case ChatMessageType.Error:
      return {
        ...base,
        type,
        metadata: {
          ...(typeof metadata.code === "string" ? { code: metadata.code } : {}),
          ...(typeof metadata.retryable === "boolean"
            ? { retryable: metadata.retryable }
            : {}),
        },
      };

    case ChatMessageType.Text:
    case ChatMessageType.Unsupported:
    case ChatMessageType.EndOfChat:
      return {
        ...base,
        type,
        metadata: {},
      };
  }
}

export function mapChatMessageToDbInsert(
  message: ChatMessage | ChatMessageInsert
): DbMessageInsert {
  return {
    chat_id: message.chatId,
    role: message.role,
    type: message.type,
    content: message.content,
    meta_data: toMetadataRecord(message.metadata),
    ...(message.createdAt ? { created_at: message.createdAt } : {}),
  };
}

function toChatMessageType(type: string): ChatMessageType {
  if (Object.values(ChatMessageType).includes(type as ChatMessageType)) {
    return type as ChatMessageType;
  }

  return ChatMessageType.Unsupported;
}

function toChatMessageRole(role: string): ChatMessageRole {
  if (Object.values(ChatMessageRole).includes(role as ChatMessageRole)) {
    return role as ChatMessageRole;
  }

  return ChatMessageRole.Assistant;
}

function toMetadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}
