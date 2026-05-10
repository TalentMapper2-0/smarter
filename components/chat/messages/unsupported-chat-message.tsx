import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { ChatMessage } from "@/types/chat";

export default function UnsupportedChatMessage({ message }: { message: ChatMessage }) {
  return (
    <Message from={message.role}>
      <MessageContent>
        <MessageResponse>
          {message.content ?? `Unsupported message type: ${message.type}`}
        </MessageResponse>
      </MessageContent>
    </Message>
  );
}