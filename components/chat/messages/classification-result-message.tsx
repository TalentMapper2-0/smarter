import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { ChatMessage, ChatMessageType, ChatMessageRole } from "@/types/chat";

export default function ClassificationResultMessage({
  message,
}: {
  message: Extract<ChatMessage, { type: ChatMessageType.ClassificationResult }>;
}) {
  return (
    <Message from={ChatMessageRole.Assistant}>
      <MessageContent>
        <MessageResponse>
          {message.content ?? "De classificatie is afgerond."}
        </MessageResponse>
      </MessageContent>
    </Message>
  );
}
