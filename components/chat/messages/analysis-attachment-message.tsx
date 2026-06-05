import type { FileUIPart } from "ai";

import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { ChatMessage, ChatMessageRole, ChatMessageType } from "@/types/chat";

export default function AnalysisAttachmentMessage({
  message,
}: {
  message: Extract<ChatMessage, { type: ChatMessageType.AnalysisAttachment }>;
}) {
  const attachments = message.metadata.files.map(
    (file, index) =>
      ({
        filename: file.name,
        id: `${message.id}-${index}`,
        mediaType: file.type,
        type: "file",
        url: "",
      }) satisfies FileUIPart & { id: string }
  );

  return (
    <Message from={ChatMessageRole.User}>
      <div className="ml-auto flex w-full max-w-xl flex-col items-end gap-2">
        {message.content ? (
          <MessageContent>
            <MessageResponse>{message.content}</MessageResponse>
          </MessageContent>
        ) : null}

        <Attachments className="justify-end" variant="list">
          {attachments.map((file) => (
            <Attachment data={file} key={file.id}>
              <AttachmentPreview />
              <AttachmentInfo showMediaType />
            </Attachment>
          ))}
        </Attachments>
      </div>
    </Message>
  );
}
