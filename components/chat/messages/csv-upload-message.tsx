import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { ChatMessage, ChatMessageRole, ChatMessageType } from "@/types/chat";
import { ChatCsvDropzone } from "../chat-csv-dropzone";

export default function CsvUploadMessage({
  message,
  isPending,
  onCsvSelected,
}: {
  message: Extract<ChatMessage, { type: ChatMessageType.CsvUploadRequest }>;
  isPending: boolean;
  onCsvSelected: (file: File) => void | Promise<void>;
}) {
  const answered = message.metadata.answered === true;

  if (answered) {
    return (
      <Message from={ChatMessageRole.Assistant}>
        <MessageContent>
          <MessageResponse>
            {message.content ?? "CSV bestand ontvangen."}
          </MessageResponse>
        </MessageContent>
      </Message>
    );
  }

  return (
    <Message from={ChatMessageRole.Assistant}>
      {message.content ? (
        <MessageContent>
          <MessageResponse>{message.content}</MessageResponse>
        </MessageContent>
      ) : null}

      <ChatCsvDropzone
        isUploading={isPending}
        onCsvSelectedAction={(file) => {
          void onCsvSelected(file);
        }}
      />
    </Message>
  );
}
