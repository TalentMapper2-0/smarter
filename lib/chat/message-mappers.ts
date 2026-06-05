import { ChatMessage, ChatMessageRole, ChatMessageType } from "@/types/chat";
import type {
  AnalysisAttachmentFile,
  AnalysisFieldKey,
  AnalysisFields,
} from "@/types/chat";
import { requestedAnalysisFields } from "./analysis";

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

    case ChatMessageType.AnalysisUploadRequest:
      return {
        ...base,
        type,
        metadata: {
          answered: metadata.answered === true,
        },
      };

    case ChatMessageType.AnalysisAttachment:
      return {
        ...base,
        type,
        metadata: {
          files: toAnalysisAttachmentFiles(metadata.files),
          ...(typeof metadata.prompt === "string" && metadata.prompt.trim()
            ? { prompt: metadata.prompt }
            : {}),
        },
      };

    case ChatMessageType.AnalysisFieldRequest:
      return {
        ...base,
        type,
        metadata: {
          answered: metadata.answered === true,
          fields: toAnalysisFieldKeys(metadata.fields),
          extractedFields: toAnalysisFields(metadata.extractedFields),
          previousResponseId:
            typeof metadata.previousResponseId === "string"
              ? metadata.previousResponseId
              : null,
        },
      };

    case ChatMessageType.AnalysisResult:
      return {
        ...base,
        type,
        metadata: {
          fields: toAnalysisFields(metadata.fields),
          missingFields: toAnalysisFieldKeys(metadata.missingFields),
          previousResponseId:
            typeof metadata.previousResponseId === "string"
              ? metadata.previousResponseId
              : null,
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

function toAnalysisAttachmentFiles(value: unknown): AnalysisAttachmentFile[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    if (!item || typeof item !== "object") {
      return {
        name: "document",
        size: 0,
        type: "",
      };
    }

    const record = item as Record<string, unknown>;

    return {
      name: typeof record.name === "string" ? record.name : "document",
      size: typeof record.size === "number" ? record.size : 0,
      type: typeof record.type === "string" ? record.type : "",
    };
  });
}

function toAnalysisFieldKeys(value: unknown): AnalysisFieldKey[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is AnalysisFieldKey =>
    requestedAnalysisFields.includes(item as AnalysisFieldKey)
  );
}

function toAnalysisFields(value: unknown): AnalysisFields {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const fields: AnalysisFields = {};

  for (const field of requestedAnalysisFields) {
    const candidate = record[field];

    if (
      candidate === null ||
      typeof candidate === "string" ||
      typeof candidate === "number" ||
      typeof candidate === "boolean" ||
      (Array.isArray(candidate) &&
        candidate.every((item) => typeof item === "string"))
    ) {
      fields[field] = candidate;
    }
  }

  return fields;
}
