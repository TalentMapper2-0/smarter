import { Message } from "@/components/ai-elements/message";
import { ChatMessage, ChatMessageRole, ChatMessageType } from "@/types/chat";
import { ChatCsvFileAttachment } from "../chat-csv-dropzone";
import { cn } from "@/lib/utils";

export default function CsvFileMessage({
  message,
}: {
  message: Extract<ChatMessage, { type: ChatMessageType.CsvFile }>;
}) {
  const file = {
    id: message.id,
    messageId: message.id,
    name: message.metadata.fileName,
    size: message.metadata.fileSize,
  };

  return (
    <Message from={message.role}>
      <ChatCsvFileAttachment
        className={cn(
          "mt-2",
          message.role === ChatMessageRole.User && "ml-auto"
        )}
        file={file}
      />
    </Message>
  );
}
