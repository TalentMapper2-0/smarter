"use client";

import type { FileUIPart } from "ai";

import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";

export type ChatComposerMessage = {
  text: string;
  files: FileUIPart[];
};

type ChatComposerProps = {
  disabled?: boolean;
  isSubmitting?: boolean;
  placeholder?: string;
  allowAttachments?: boolean;
  accept?: string;
  onSubmitAction: (message: ChatComposerMessage) => void | Promise<void>;
};

function ChatComposerAttachments() {
  const attachments = usePromptInputAttachments();

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <Attachments variant="inline">
      {attachments.files.map((file) => (
        <Attachment
          data={file}
          key={file.id}
          onRemove={() => attachments.remove(file.id)}
        >
          <AttachmentPreview />
          <AttachmentInfo />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
}

export function ChatComposer({
  disabled = false,
  isSubmitting = false,
  placeholder = "Stuur een bericht",
  allowAttachments = false,
  accept,
  onSubmitAction: onSubmit,
}: ChatComposerProps) {
  return (
    <PromptInput
      accept={accept}
      className="mx-auto w-full max-w-3xl"
      globalDrop={allowAttachments}
      maxFiles={10}
      multiple={allowAttachments}
      onSubmit={async ({ text, files }) => {
        const message = text.trim();

        if (disabled) {
          return;
        }

        if (!message && files.length === 0) {
          return;
        }

        await onSubmit({
          text: message,
          files,
        });
      }}
    >
      {allowAttachments ? (
        <PromptInputHeader>
          <ChatComposerAttachments />
        </PromptInputHeader>
      ) : null}

      <PromptInputBody>
        <PromptInputTextarea
          disabled={disabled || isSubmitting}
          placeholder={placeholder}
        />
      </PromptInputBody>

      <PromptInputFooter>
        <PromptInputTools>
          {allowAttachments ? (
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments label="Documenten toevoegen" />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
          ) : null}
        </PromptInputTools>

        <PromptInputSubmit disabled={disabled || isSubmitting} />
      </PromptInputFooter>
    </PromptInput>
  );
}