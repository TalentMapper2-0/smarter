"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Spinner } from "@/components/ui/spinner";
import { messages as chatMessages, type MessageKey } from "@/lib/chat/messages";
import { trpc } from "@/trpc/client/client";
import { Chat, ChatMessage, ChatMessageRole, ChatStatus } from "@/types/chat";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "../ai-elements/message";
import { ChatComposer } from "./chat-composer";
import { ChatCsvColumnMapper } from "./chat-csv-column-mapper";
import {
  ChatCsvDropzone,
  ChatCsvFileAttachment,
  type ChatSelectedCsvFile,
} from "./chat-csv-dropzone";
import { ColumnMapping, REQUIRED_FIELDS } from "./constants";
import { createEmptyMapping, parseCsv, suggestMapping } from "./csv-utils";
import { cn } from "@/lib/utils";

type Props = {
  chat: Chat;
};

const createLocalMessageKey = () =>
  `local-${Math.random().toString(36).slice(2, 10)}`;

type StreamEvent =
  | {
      type: "chunk";
      content: string;
    }
  | {
      type: "done";
      nextStatus?: ChatStatus;
    };

export default function AgentConversation({ chat }: Props) {
  const utils = trpc.useUtils();
  const updateChatStatus = trpc.chat.updateStatus.useMutation();
  const reuploadCsv = trpc.chat.reuploadCsv.useMutation();
  const saveMappedCsv = trpc.chat.saveMappedCsv.useMutation();
  const uploadCsvMetadata = trpc.chat.uploadCsvMetadata.useMutation();
  const saveVacancy = trpc.chat.saveVacancy.useMutation();
  const [localMessageState, setLocalMessageState] = useState<{
    chatId: string;
    messages: ChatMessage[];
  }>({
    chatId: chat.id,
    messages: [],
  });
  const [streamedAssistantMessage, setStreamedAssistantMessage] = useState({
    chatId: chat.id,
    content: "",
    isStreaming: false,
  });
  const [optimisticStatus, setOptimisticStatus] = useState<{
    chatId: string;
    status: ChatStatus;
  } | null>(null);
  const [selectedCsvFileState, setSelectedCsvFileState] = useState<{
    chatId: string;
    file: ChatSelectedCsvFile;
  } | null>(null);
  const [optimisticUserTextState, setOptimisticUserTextState] = useState<{
    chatId: string;
    content: string;
  } | null>(null);
  const [csvColumnsState, setCsvColumnsState] = useState<{
    chatId: string;
    columns: string[];
  } | null>(null);
  const [columnMappingState, setColumnMappingState] = useState<{
    chatId: string;
    mapping: ColumnMapping;
  } | null>(null);
  const [csvRowsState, setCsvRowsState] = useState<{
    chatId: string;
    rows: unknown[];
  } | null>(null);
  const persistedMessages = [
    ...(chat.messages ?? []),
    ...(localMessageState.chatId === chat.id ? localMessageState.messages : []),
  ];
  const shouldStreamInitialMessage =
    chat.status === ChatStatus.Initialized &&
    !persistedMessages.some(
      (message) =>
        message.role === ChatMessageRole.Assistant &&
        message.content === chatMessages.chatInitialized
    );
  const streamedMessageContent =
    streamedAssistantMessage.chatId === chat.id
      ? streamedAssistantMessage.content
      : "";
  const hasPendingStreamMessage =
    streamedAssistantMessage.chatId === chat.id &&
    streamedAssistantMessage.isStreaming;
  const currentStatus =
    optimisticStatus?.chatId === chat.id
      ? optimisticStatus.status
      : chat.status;
  const selectedCsvFile =
    selectedCsvFileState?.chatId === chat.id ? selectedCsvFileState.file : null;
  const optimisticUserText =
    optimisticUserTextState?.chatId === chat.id
      ? optimisticUserTextState.content
      : null;
  const hasPersistedSelectedCsvFile = Boolean(
    selectedCsvFile &&
    persistedMessages.some(
      (message) =>
        message.role === ChatMessageRole.User &&
        message.files?.some(
          (file) =>
            file.name === selectedCsvFile.name &&
            file.size === selectedCsvFile.size
        )
    )
  );
  const hasPersistedOptimisticUserText = Boolean(
    optimisticUserText &&
    persistedMessages.some(
      (message) =>
        message.role === ChatMessageRole.User &&
        message.content === optimisticUserText
    )
  );
  const csvColumns =
    csvColumnsState?.chatId === chat.id ? csvColumnsState.columns : [];
  const columnMapping =
    columnMappingState?.chatId === chat.id
      ? columnMappingState.mapping
      : createEmptyMapping();
  const isWaitingForCsvInput = currentStatus === ChatStatus.WaitingForCsvInput;
  const isMappingCsvColumns = currentStatus === ChatStatus.MappingCsvColumns;
  const isNeedsCsvColumnMapping =
    currentStatus === ChatStatus.NeedsCsvColumnMapping;
  const isWaitingForVacancy = currentStatus === ChatStatus.WaitingForVacancy;
  const isChatInputDisabled =
    shouldStreamInitialMessage ||
    hasPendingStreamMessage ||
    isWaitingForCsvInput ||
    isMappingCsvColumns ||
    isNeedsCsvColumnMapping;
  const messages = [
    ...persistedMessages,
    ...(shouldStreamInitialMessage
      ? [
          {
            id: `chat-initial-message-${chat.id}`,
            chatId: chat.id,
            role: ChatMessageRole.Assistant,
            content: streamedMessageContent,
            files: [],
          },
        ]
      : []),
  ];

  const appendLocalMessage = useCallback(
    (message: {
      id: string;
      chatId: string;
      role: ChatMessageRole;
      content: string | null;
      files?: { id: string; messageId: string; name: string; size: number }[];
    }) => {
      setLocalMessageState((currentState) => ({
        chatId: message.chatId,
        messages:
          currentState.chatId === message.chatId
            ? [...currentState.messages, message]
            : [message],
      }));
    },
    []
  );

  const streamAssistantMessage = useCallback(
    async ({
      messageKey,
      nextStatus,
    }: {
      messageKey?: MessageKey;
      nextStatus?: ChatStatus;
    } = {}) => {
      const abortController = new AbortController();
      let fullContent = "";
      setStreamedAssistantMessage({
        chatId: chat.id,
        content: "",
        isStreaming: true,
      });

      const appendStreamedAssistantMessage = (chunk: string) => {
        startTransition(() => {
          setStreamedAssistantMessage((currentMessage) => {
            if (currentMessage.chatId !== chat.id) {
              return {
                chatId: chat.id,
                content: chunk,
                isStreaming: true,
              };
            }

            return {
              chatId: chat.id,
              content: currentMessage.content + chunk,
              isStreaming: true,
            };
          });
        });
      };

      try {
        const response = await fetch(`/api/chats/${chat.id}/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messageKey,
            nextStatus,
          }),
          signal: abortController.signal,
        });

        if (response.status === 204) {
          if (nextStatus) {
            setOptimisticStatus({
              chatId: chat.id,
              status: nextStatus,
            });
          }
          void utils.chat.listRecent.invalidate();
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to stream chat message");
        }

        if (!response.body) {
          throw new Error("Chat message stream is empty");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const handleStreamLine = (line: string) => {
          if (!line.trim()) {
            return;
          }

          const event = JSON.parse(line) as StreamEvent;

          if (event.type === "chunk") {
            fullContent += event.content;
            appendStreamedAssistantMessage(event.content);
            return;
          }

          if (event.type === "done" && event.nextStatus) {
            setOptimisticStatus({
              chatId: chat.id,
              status: event.nextStatus,
            });
          }
        };

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            handleStreamLine(line);
          }
        }

        buffer += decoder.decode();

        if (buffer) {
          handleStreamLine(buffer);
        }

        const remainingChunk = decoder.decode();

        if (remainingChunk) {
          fullContent += remainingChunk;
          appendStreamedAssistantMessage(remainingChunk);
        }
        appendLocalMessage({
          id: createLocalMessageKey(),
          chatId: chat.id,
          role: ChatMessageRole.Assistant,
          content: fullContent,
          files: [],
        });

        void utils.chat.listRecent.invalidate();
      } finally {
        abortController.abort();
        setStreamedAssistantMessage({
          chatId: chat.id,
          content: "",
          isStreaming: false,
        });
      }
    },
    [appendLocalMessage, chat.id, utils.chat.listRecent]
  );

  useEffect(() => {
    if (!shouldStreamInitialMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void streamAssistantMessage().catch((error) => {
        console.error("Failed to stream initial chat message", error);
      });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [shouldStreamInitialMessage, streamAssistantMessage]);

  const mapRowsToCandidates = (
    rows: unknown[],
    mapping: ColumnMapping
  ): Record<string, unknown>[] =>
    rows.map((row) => {
      const rowObj = row as Record<string, unknown>;
      const mappedRow: Record<string, unknown> = {};

      for (const field of REQUIRED_FIELDS) {
        const key = mapping[field] as string;
        mappedRow[field] = rowObj[key];
      }

      return mappedRow;
    });

  const handleCsvSelected = async (file: File) => {
    const mappingStatus = ChatStatus.MappingCsvColumns;

    setSelectedCsvFileState({
      chatId: chat.id,
      file: {
        name: file.name,
        size: file.size,
      },
    });
    setOptimisticStatus({
      chatId: chat.id,
      status: mappingStatus,
    });
    setCsvColumnsState(null);
    setColumnMappingState(null);
    setCsvRowsState(null);

    try {
      await updateChatStatus.mutateAsync({
        id: chat.id,
        status: mappingStatus,
      });

      const csvText = await file.text();
      const parsedCsv = parseCsv(csvText);

      if (!parsedCsv.columns.length || !parsedCsv.rows.length) {
        setSelectedCsvFileState(null);
        setOptimisticUserTextState(null);
        setOptimisticStatus({
          chatId: chat.id,
          status: ChatStatus.WaitingForCsvInput,
        });

        await updateChatStatus.mutateAsync({
          id: chat.id,
          status: ChatStatus.WaitingForCsvInput,
        });

        throw new Error(chatMessages.csvUploadNew);
      }

      const nextMapping = suggestMapping(parsedCsv.columns);
      const allFieldsMapped = REQUIRED_FIELDS.every((field) =>
        Boolean(nextMapping[field])
      );

      const uploadedMessage = await uploadCsvMetadata.mutateAsync({
        chatId: chat.id,
        fileName: file.name,
        fileSize: file.size,
      });
      appendLocalMessage(uploadedMessage);
      setSelectedCsvFileState(null);

      if (allFieldsMapped) {
        await saveMappedCsv.mutateAsync({
          chatId: chat.id,
          fileName: file.name,
          fileSize: file.size,
          mappedRows: mapRowsToCandidates(parsedCsv.rows, nextMapping),
        });

        setCsvColumnsState(null);
        setColumnMappingState(null);
        setCsvRowsState(null);
        setOptimisticStatus(null);
        await streamAssistantMessage({
          messageKey: "vacancyRequest",
        });
        setSelectedCsvFileState(null);
        return;
      }

      setCsvColumnsState({
        chatId: chat.id,
        columns: parsedCsv.columns,
      });
      setCsvRowsState({
        chatId: chat.id,
        rows: parsedCsv.rows,
      });
      setColumnMappingState({
        chatId: chat.id,
        mapping: nextMapping,
      });
      setOptimisticStatus({
        chatId: chat.id,
        status: ChatStatus.NeedsCsvColumnMapping,
      });

      await streamAssistantMessage({
        messageKey: "csvNeedsColumnMapping",
      });
    } catch (error) {
      setSelectedCsvFileState(null);
      setOptimisticUserTextState(null);
      setCsvColumnsState(null);
      setColumnMappingState(null);
      setCsvRowsState(null);
      setOptimisticStatus(null);
      throw error;
    }
  };

  const handleColumnMappingChange = async (nextMapping: ColumnMapping) => {
    setColumnMappingState({
      chatId: chat.id,
      mapping: nextMapping,
    });

    const allFieldsMapped = REQUIRED_FIELDS.every((field) =>
      Boolean(nextMapping[field])
    );

    if (!allFieldsMapped) {
      return;
    }

    const nextStatus = ChatStatus.WaitingForVacancy;

    setOptimisticStatus({
      chatId: chat.id,
      status: nextStatus,
    });

    try {
      const rowsToSave = mapRowsToCandidates(
        csvRowsState?.chatId === chat.id ? csvRowsState.rows : [],
        nextMapping
      );

      await saveMappedCsv.mutateAsync({
        chatId: chat.id,
        fileName: selectedCsvFile?.name ?? "onbekend.csv",
        fileSize: selectedCsvFile?.size ?? 0,
        mappedRows: rowsToSave,
      });

      setCsvColumnsState(null);
      setColumnMappingState(null);
      setCsvRowsState(null);
      setOptimisticStatus(null);

      await streamAssistantMessage({
        messageKey: "vacancyRequest",
      });
      setSelectedCsvFileState(null);
    } catch {
      setOptimisticStatus({
        chatId: chat.id,
        status: ChatStatus.NeedsCsvColumnMapping,
      });
    }
  };

  const handleReuploadCsv = async () => {
    if (!selectedCsvFile) return;

    setOptimisticStatus({
      chatId: chat.id,
      status: ChatStatus.WaitingForCsvInput,
    });

    try {
      const uploadedMessage = await reuploadCsv.mutateAsync({
        chatId: chat.id,
        fileName: selectedCsvFile.name,
        fileSize: selectedCsvFile.size,
      });
      appendLocalMessage(uploadedMessage);
      setSelectedCsvFileState(null);

      setCsvColumnsState(null);
      setColumnMappingState(null);
      setCsvRowsState(null);
      await streamAssistantMessage({
        messageKey: "csvReuploadOk",
      });
    } catch (error) {
      console.error("Failed to reupload csv", error);
      setOptimisticStatus({
        chatId: chat.id,
        status: ChatStatus.NeedsCsvColumnMapping,
      });
    }
  };

  const handleChatSubmit = async (content: string) => {
    if (isWaitingForVacancy) {
      setOptimisticUserTextState({
        chatId: chat.id,
        content,
      });

      try {
        const savedMessage = await saveVacancy.mutateAsync({
          chatId: chat.id,
          vacancyText: content,
        });
        appendLocalMessage(savedMessage);
        setOptimisticUserTextState(null);

        await streamAssistantMessage({
          messageKey: "vacancyUploaded",
        });
        setOptimisticUserTextState(null);
      } catch (error) {
        setOptimisticUserTextState(null);
        console.error("Failed to save vacancy", error);
      }
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              {message.content && (
                <MessageContent>
                  {shouldStreamInitialMessage &&
                  message.id === `chat-initial-message-${chat.id}` ? (
                    <MessageResponse isAnimating>
                      {message.content}
                    </MessageResponse>
                  ) : message.id === `chat-stream-message-${chat.id}` ? (
                    <MessageResponse isAnimating>
                      {message.content}
                    </MessageResponse>
                  ) : (
                    <MessageResponse>{message.content}</MessageResponse>
                  )}
                </MessageContent>
              )}

              {message.files?.map((file) => (
                <ChatCsvFileAttachment
                  key={file.id}
                  className={cn(
                    "mt-2",
                    message.role === ChatMessageRole.User && "ml-auto"
                  )}
                  file={file}
                />
              ))}
            </Message>
          ))}

          {selectedCsvFile && !hasPersistedSelectedCsvFile ? (
            <Message from={ChatMessageRole.User}>
              <ChatCsvFileAttachment
                className="ml-auto"
                file={selectedCsvFile}
              />
            </Message>
          ) : null}

          {optimisticUserText && !hasPersistedOptimisticUserText ? (
            <Message from={ChatMessageRole.User}>
              <MessageContent>
                <MessageResponse>{optimisticUserText}</MessageResponse>
              </MessageContent>
            </Message>
          ) : null}

          {hasPendingStreamMessage && !shouldStreamInitialMessage ? (
            <Message from={ChatMessageRole.Assistant}>
              <MessageContent>
                <MessageResponse isAnimating>
                  {streamedMessageContent}
                </MessageResponse>
              </MessageContent>
            </Message>
          ) : null}

          {isMappingCsvColumns ? (
            <Message from={ChatMessageRole.Assistant}>
              <MessageContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-4" />
                  <span>Aan het denken...</span>
                </div>
              </MessageContent>
            </Message>
          ) : null}

          {isWaitingForCsvInput &&
          !shouldStreamInitialMessage &&
          !hasPendingStreamMessage ? (
            <Message from={ChatMessageRole.Assistant}>
              <ChatCsvDropzone
                isUploading={
                  updateChatStatus.isPending ||
                  uploadCsvMetadata.isPending ||
                  saveMappedCsv.isPending ||
                  reuploadCsv.isPending
                }
                onCsvSelectedAction={handleCsvSelected}
              />
            </Message>
          ) : null}

          {isNeedsCsvColumnMapping && !hasPendingStreamMessage ? (
            <Message from={ChatMessageRole.Assistant}>
              <MessageContent>
                <ChatCsvColumnMapper
                  columns={csvColumns}
                  disabled={updateChatStatus.isPending || reuploadCsv.isPending}
                  mapping={columnMapping}
                  onChangeAction={(nextMapping) => {
                    void handleColumnMappingChange(nextMapping);
                  }}
                  onReuploadAction={() => {
                    void handleReuploadCsv();
                  }}
                />
              </MessageContent>
            </Message>
          ) : null}
        </ConversationContent>

        <ConversationScrollButton />
      </Conversation>
      <div className="shrink-0 bg-background px-4 pt-2 pb-4">
        <ChatComposer
          disabled={isChatInputDisabled}
          placeholder="Antwoorden"
          onSubmitAction={handleChatSubmit}
        />
      </div>
    </div>
  );
}
