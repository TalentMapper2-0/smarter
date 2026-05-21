import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { ChatMessage } from "@/types/chat";

export default function EndOfChatMessage({ message }: { message: ChatMessage }) {
  return (
    <Message from={message.role}>
      {message.content ? (
        <MessageContent>
          <MessageResponse>{message.content}</MessageResponse>
        </MessageContent>
      ) : null}
    </Message>
  );
}
