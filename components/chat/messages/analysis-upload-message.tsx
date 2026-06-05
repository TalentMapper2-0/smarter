"use client";

import type { FileUIPart } from "ai";
import { PaperclipIcon, SendIcon } from "lucide-react";
import { DragEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessage, ChatMessageRole, ChatMessageType } from "@/types/chat";

type SelectedAnalysisFile = {
  id: string;
  file: File;
  part: FileUIPart & { id: string };
};

const acceptedAnalysisFileTypes = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
].join(",");

export default function AnalysisUploadMessage({
  message,
  isPending,
  onAnalysisSubmit,
}: {
  message: Extract<
    ChatMessage,
    { type: ChatMessageType.AnalysisUploadRequest }
  >;
  isPending: boolean;
  onAnalysisSubmit: (files: File[], text: string) => void | Promise<void>;
}) {
  const answered = message.metadata.answered === true;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const filesRef = useRef<SelectedAnalysisFile[]>([]);
  const [files, setFiles] = useState<SelectedAnalysisFile[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(
    () => () => {
      for (const item of filesRef.current) {
        URL.revokeObjectURL(item.part.url);
      }
    },
    []
  );

  const canSubmit =
    !isPending && !answered && (files.length > 0 || text.trim().length > 0);

  const fileParts = useMemo(() => files.map((item) => item.part), [files]);

  const addFiles = (incomingFiles: FileList | File[]) => {
    const nextFiles = [...incomingFiles];

    if (!nextFiles.length) {
      return;
    }

    setFiles((currentFiles) => [
      ...currentFiles,
      ...nextFiles.map((file) => {
        const id = crypto.randomUUID();

        return {
          id,
          file,
          part: {
            filename: file.name,
            id,
            mediaType: file.type,
            type: "file" as const,
            url: URL.createObjectURL(file),
          },
        };
      }),
    ]);
  };

  const removeFile = (id: string) => {
    setFiles((currentFiles) => {
      const selectedFile = currentFiles.find((file) => file.id === id);

      if (selectedFile) {
        URL.revokeObjectURL(selectedFile.part.url);
      }

      return currentFiles.filter((file) => file.id !== id);
    });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (answered || isPending || !event.dataTransfer.files.length) {
      return;
    }

    addFiles(event.dataTransfer.files);
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    void onAnalysisSubmit(
      files.map((item) => item.file),
      text
    );
  };

  if (answered) {
    return (
      <Message from={ChatMessageRole.Assistant}>
        <MessageContent>
          <MessageResponse>
            {message.content ?? "Documenten ontvangen."}
          </MessageResponse>
        </MessageContent>
      </Message>
    );
  }

  return (
    <Message from={ChatMessageRole.Assistant}>
      <MessageContent className="w-full max-w-xl">
        <div className="flex flex-col gap-3">
          {message.content ? (
            <MessageResponse>{message.content}</MessageResponse>
          ) : null}

          <input
            accept={acceptedAnalysisFileTypes}
            className="hidden"
            multiple
            onChange={(event) => {
              if (event.currentTarget.files) {
                addFiles(event.currentTarget.files);
              }

              event.currentTarget.value = "";
            }}
            ref={inputRef}
            type="file"
          />

          <div
            className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-muted/30 p-4 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <PaperclipIcon className="size-5 text-muted-foreground" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Voeg analysedocumenten toe</p>
              <p className="text-xs text-muted-foreground">
                PDF, DOCX of tekstbestanden.
              </p>
            </div>
            <Button
              disabled={isPending}
              onClick={() => inputRef.current?.click()}
              type="button"
              variant="outline"
            >
              <PaperclipIcon data-icon="inline-start" />
              Documenten kiezen
            </Button>
          </div>

          {fileParts.length ? (
            <Attachments variant="list">
              {fileParts.map((file) => (
                <Attachment
                  data={file}
                  key={file.id}
                  onRemove={() => removeFile(file.id)}
                >
                  <AttachmentPreview />
                  <AttachmentInfo showMediaType />
                  <AttachmentRemove />
                </Attachment>
              ))}
            </Attachments>
          ) : null}

          <Textarea
            disabled={isPending}
            onChange={(event) => setText(event.currentTarget.value)}
            placeholder="Optionele context"
            value={text}
          />

          <div className="flex justify-end">
            <Button disabled={!canSubmit} onClick={handleSubmit} type="button">
              {isPending ? <Spinner /> : <SendIcon data-icon="inline-start" />}
              Analyseren
            </Button>
          </div>
        </div>
      </MessageContent>
    </Message>
  );
}
