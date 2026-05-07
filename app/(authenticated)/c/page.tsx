import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";

export default function Page() {
  return (
    <Message from="assistant">
      <MessageContent>
        <MessageResponse>Hello, world!</MessageResponse>
      </MessageContent>
    </Message>
  );
}
