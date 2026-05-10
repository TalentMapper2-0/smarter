import { Message, MessageContent } from "@/components/ai-elements/message";
import { ChatMessage, ChatMessageType, ChatMessageRole } from "@/types/chat";

export default function ErrorChatMessage({
  message,
}: {
  message: Extract<ChatMessage, { type: ChatMessageType.Error }>;
}) {
  return (
    <Message from={ChatMessageRole.Assistant}>
      <MessageContent>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {message.content ?? "Er ging iets mis."}
        </div>
      </MessageContent>
    </Message>
  );
}
