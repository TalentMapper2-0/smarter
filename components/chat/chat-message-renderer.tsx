"use client";

import type { ChatMessage } from "@/types/chat";
import { ChatMessageType } from "@/types/chat";
import type { ColumnMapping } from "./constants";
import AnalysisAttachmentMessage from "./messages/analysis-attachment-message";
import AnalysisFieldRequestMessage from "./messages/analysis-field-request-message";
import AnalysisResultMessage from "./messages/analysis-result-message";
import CommentRequestMessage from "./messages/comment-request-message";
import CsvColumnMappingRequestMessage from "./messages/csv-column-mapping-request-message";
import CsvFileMessage from "./messages/csv-file-message";
import CsvUploadMessage from "./messages/csv-upload-message";
import EndOfChatMessage from "./messages/end-of-chat-message";
import ErrorChatMessage from "./messages/error-message";
import TextMessage from "./messages/text-message";
import UnsupportedChatMessage from "./messages/unsupported-chat-message";

type ChatMessageRendererProps = {
  message: ChatMessage;
  columns?: string[];
  mapping?: ColumnMapping;
  handlers: {
    onCsvSelected: (file: File) => void | Promise<void>;
    onAnalysisSubmit: (files: File[], text: string) => void | Promise<void>;
    onColumnMappingChange: (mapping: ColumnMapping) => void | Promise<void>;
    onReuploadCsv: () => void | Promise<void>;
    onCommentChoice: (
      wantsComment: boolean,
      messageId: string
    ) => void | Promise<void>;
  };
  isPending?: boolean;
};

export function ChatMessageRenderer({
  message,
  columns,
  mapping,
  handlers,
  isPending = false,
}: ChatMessageRendererProps) {
  switch (message.type) {
    case ChatMessageType.Text:
      return <TextMessage message={message} />;

    case ChatMessageType.AnalysisUploadRequest:
      return <TextMessage message={message} />;

    case ChatMessageType.AnalysisAttachment:
      return <AnalysisAttachmentMessage message={message} />;

    case ChatMessageType.AnalysisFieldRequest:
      return <AnalysisFieldRequestMessage message={message} />;

    case ChatMessageType.AnalysisResult:
      return <AnalysisResultMessage message={message} />;

    case ChatMessageType.CsvUploadRequest:
      return (
        <CsvUploadMessage
          message={message}
          isPending={isPending}
          onCsvSelected={handlers.onCsvSelected}
        />
      );

    case ChatMessageType.CsvFile:
      return <CsvFileMessage message={message} />;

    case ChatMessageType.CsvColumnMappingRequest:
      if (!mapping) {
        return <UnsupportedChatMessage message={message} />;
      }

      return (
        <CsvColumnMappingRequestMessage
          message={message}
          columns={columns ?? []}
          mapping={mapping}
          isPending={isPending}
          onColumnMappingChange={handlers.onColumnMappingChange}
          onReuploadCsv={handlers.onReuploadCsv}
        />
      );

    case ChatMessageType.CommentRequest:
      return (
        <CommentRequestMessage
          message={message}
          isPending={isPending}
          onCommentChoice={(wantsComment) =>
            handlers.onCommentChoice(wantsComment, message.id)
          }
        />
      );

    case ChatMessageType.Error:
      return <ErrorChatMessage message={message} />;

    case ChatMessageType.EndOfChat:
      return <EndOfChatMessage message={message} />;

    default:
      return <UnsupportedChatMessage message={message} />;
  }
}
