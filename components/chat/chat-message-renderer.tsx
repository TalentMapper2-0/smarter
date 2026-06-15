"use client";

import type { ChatMessage } from "@/types/chat";
import { ChatMessageType } from "@/types/chat";
import AnalysisAttachmentMessage from "./messages/analysis-attachment-message";
import AnalysisFieldRequestMessage from "./messages/analysis-field-request-message";
import AnalysisResultMessage from "./messages/analysis-result-message";
import EndOfChatMessage from "./messages/end-of-chat-message";
import ErrorChatMessage from "./messages/error-message";
import TextMessage from "./messages/text-message";
import UnsupportedChatMessage from "./messages/unsupported-chat-message";

type ChatMessageRendererProps = {
  message: ChatMessage;
};

export function ChatMessageRenderer({ message }: ChatMessageRendererProps) {
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

    case ChatMessageType.Error:
      return <ErrorChatMessage message={message} />;

    case ChatMessageType.EndOfChat:
      return <EndOfChatMessage message={message} />;

    default:
      return <UnsupportedChatMessage message={message} />;
  }
}
