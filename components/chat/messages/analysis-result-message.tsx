import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { ChatMessage, ChatMessageRole, ChatMessageType } from "@/types/chat";

export default function AnalysisResultMessage({
  message,
}: {
  message: Extract<ChatMessage, { type: ChatMessageType.AnalysisResult }>;
}) {
  return (
    <Message from={ChatMessageRole.Assistant}>
      <MessageContent className="w-full max-w-xl">
        <MessageResponse>{message.content ?? "{}"}</MessageResponse>
      </MessageContent>
    </Message>
  );
}
