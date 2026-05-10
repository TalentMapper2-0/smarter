"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Spinner } from "@/components/ui/spinner";
import { mapDbMessageToChatMessage } from "@/lib/chat/message-mappers";
import { messages as chatMessages } from "@/lib/chat/messages";
import { trpc } from "@/trpc/client/client";
import {
  Chat,
  ChatMessage,
  ChatMessageRole,
  ChatMessageType,
  ChatStatus,
} from "@/types/chat";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "../ai-elements/message";
import { ChatComposer } from "./chat-composer";
import {
  ChatCsvFileAttachment,
  type ChatSelectedCsvFile,
} from "./chat-csv-dropzone";
import { ChatMessageRenderer } from "./chat-message-renderer";
import { ColumnMapping, REQUIRED_FIELDS } from "./constants";
import { createEmptyMapping, parseCsv, suggestMapping } from "./csv-utils";

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
      messageType: ChatMessageType;
      metadata: Record<string, unknown>;
      nextStatus?: ChatStatus;
    };

export default function AgentConversation({ chat }: Props) {
  const utils = trpc.useUtils();
  const updateChatStatus = trpc.chat.updateStatus.useMutation();
  const reuploadCsv = trpc.chat.reuploadCsv.useMutation();
  const saveMappedCsv = trpc.chat.saveMappedCsv.useMutation();
  const uploadCsvMetadata = trpc.chat.uploadCsvMetadata.useMutation();
  const saveVacancy = trpc.chat.saveVacancy.useMutation();
  const saveComment = trpc.chat.saveComment.useMutation();
  const confirmComment = trpc.chat.confirmComment.useMutation();
  const requestedStreamStatusRef = useRef<string | null>(null);
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
        message.type === ChatMessageType.CsvFile &&
        message.metadata.fileName === selectedCsvFile.name &&
        message.metadata.fileSize === selectedCsvFile.size
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
  const isCommentRequest = currentStatus === ChatStatus.CommentRequest;
  const isWaitingForComment = currentStatus === ChatStatus.WaitingForComment;
  const canSubmitText = isWaitingForVacancy || isWaitingForComment;
  const isChatInputDisabled =
    hasPendingStreamMessage ||
    isWaitingForCsvInput ||
    isMappingCsvColumns ||
    isNeedsCsvColumnMapping ||
    !canSubmitText;
  const composerPlaceholder = isWaitingForVacancy
    ? "Plak de vacaturetekst"
    : isWaitingForComment
      ? "Voeg opmerkingen toe"
      : "Antwoorden";
  const messages = deriveAnsweredRequestMessages(
    persistedMessages,
    currentStatus
  );
  const hasOpenCsvUploadRequest = messages.some(
    (message) =>
      message.type === ChatMessageType.CsvUploadRequest &&
      message.metadata.answered !== true
  );
  const hasOpenCsvColumnMappingRequest = messages.some(
    (message) =>
      message.type === ChatMessageType.CsvColumnMappingRequest &&
      message.metadata.answered !== true
  );
  const hasOpenCommentRequest = messages.some(
    (message) =>
      message.type === ChatMessageType.CommentRequest &&
      message.metadata.answered !== true
  );
  const isPending =
    updateChatStatus.isPending ||
    reuploadCsv.isPending ||
    saveMappedCsv.isPending ||
    uploadCsvMetadata.isPending ||
    saveVacancy.isPending ||
    saveComment.isPending ||
    confirmComment.isPending;

  const appendLocalMessage = useCallback((message: ChatMessage) => {
    setLocalMessageState((currentState) => ({
      chatId: message.chatId,
      messages:
        currentState.chatId === message.chatId
          ? [...currentState.messages, message]
          : [message],
    }));
  }, []);

  const streamAssistantMessage = useCallback(async () => {
    const abortController = new AbortController();
    let fullContent = "";
    let messageType = ChatMessageType.Text;
    let metadata: Record<string, unknown> = {};
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
        body: JSON.stringify({}),
        signal: abortController.signal,
      });

      if (response.status === 204) {
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
          messageType = event.messageType;
          metadata = event.metadata;
          setOptimisticStatus({
            chatId: chat.id,
            status: event.nextStatus,
          });
          return;
        }

        if (event.type === "done") {
          messageType = event.messageType;
          metadata = event.metadata;
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
        ...mapDbMessageToChatMessage({
          id: createLocalMessageKey(),
          chat_id: chat.id,
          role: ChatMessageRole.Assistant,
          type: messageType,
          content: fullContent,
          created_at: new Date().toISOString(),
          meta_data: metadata,
        }),
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
  }, [appendLocalMessage, chat.id, utils.chat.listRecent]);

  useEffect(() => {
    const streamStatusKey = `${chat.id}:${currentStatus}`;

    if (requestedStreamStatusRef.current === streamStatusKey) {
      return;
    }

    requestedStreamStatusRef.current = streamStatusKey;
    void streamAssistantMessage().catch((error) => {
      requestedStreamStatusRef.current = null;
      console.error("Failed to stream chat status message", error);
    });
  }, [chat.id, currentStatus, streamAssistantMessage]);

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
        setOptimisticStatus({
          chatId: chat.id,
          status: ChatStatus.CsvColumnsMatched,
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

      await updateChatStatus.mutateAsync({
        id: chat.id,
        status: ChatStatus.NeedsCsvColumnMapping,
      });

      setOptimisticStatus({
        chatId: chat.id,
        status: ChatStatus.NeedsCsvColumnMapping,
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
      setOptimisticStatus({
        chatId: chat.id,
        status: ChatStatus.CsvColumnsMatched,
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
      await updateChatStatus.mutateAsync({
        id: chat.id,
        status: ChatStatus.WaitingForCsvInput,
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

        setOptimisticStatus({
          chatId: chat.id,
          status: ChatStatus.CommentRequest,
        });
        setOptimisticUserTextState(null);
      } catch (error) {
        setOptimisticUserTextState(null);
        console.error("Failed to save vacancy", error);
      }
      return;
    }

    if (isWaitingForComment) {
      setOptimisticUserTextState({
        chatId: chat.id,
        content,
      });

      try {
        const savedMessage = await saveComment.mutateAsync({
          chatId: chat.id,
          commentText: content,
        });
        appendLocalMessage(savedMessage);
        setOptimisticUserTextState(null);
        setOptimisticStatus({
          chatId: chat.id,
          status: ChatStatus.ReadyToClassify,
        });
      } catch (error) {
        setOptimisticUserTextState(null);
        console.error("Failed to save comment", error);
      }
    }
  };

  const handleCommentChoice = async (
    wantsComment: boolean,
    messageId?: string
  ) => {
    const nextStatus = wantsComment
      ? ChatStatus.WaitingForComment
      : ChatStatus.ReadyToClassify;

    setOptimisticUserTextState({
      chatId: chat.id,
      content: wantsComment ? "Ja" : "Nee",
    });

    try {
      const savedMessage = await confirmComment.mutateAsync({
        chatId: chat.id,
        wantsComment,
        ...(messageId && !messageId.startsWith("local-") ? { messageId } : {}),
      });
      appendLocalMessage(savedMessage);
      setOptimisticUserTextState(null);

      setOptimisticStatus({
        chatId: chat.id,
        status: nextStatus,
      });
    } catch (error) {
      setOptimisticUserTextState(null);
      setOptimisticStatus({
        chatId: chat.id,
        status: ChatStatus.CommentRequest,
      });
      console.error("Failed to confirm comment choice", error);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {messages.map((message) => (
            <ChatMessageRenderer
              key={message.id}
              message={message}
              columns={csvColumns}
              mapping={columnMapping}
              isPending={isPending}
              handlers={{
                onCsvSelected: handleCsvSelected,
                onColumnMappingChange: handleColumnMappingChange,
                onReuploadCsv: handleReuploadCsv,
                onCommentChoice: handleCommentChoice,
              }}
            />
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

          {hasPendingStreamMessage ? (
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

          {isWaitingForCsvInput && !hasPendingStreamMessage ? (
            !hasOpenCsvUploadRequest ? (
              <ChatMessageRenderer
                message={createLocalRequestMessage({
                  id: `local-${chat.id}-csv-upload-request`,
                  chatId: chat.id,
                  type: ChatMessageType.CsvUploadRequest,
                  content: chatMessages.chatInitialized,
                  metadata: { answered: false },
                })}
                columns={csvColumns}
                mapping={columnMapping}
                isPending={isPending}
                handlers={{
                  onCsvSelected: handleCsvSelected,
                  onColumnMappingChange: handleColumnMappingChange,
                  onReuploadCsv: handleReuploadCsv,
                  onCommentChoice: handleCommentChoice,
                }}
              />
            ) : null
          ) : null}

          {isNeedsCsvColumnMapping && !hasPendingStreamMessage ? (
            !hasOpenCsvColumnMappingRequest ? (
              <ChatMessageRenderer
                message={createLocalRequestMessage({
                  id: `local-${chat.id}-csv-column-mapping-request`,
                  chatId: chat.id,
                  type: ChatMessageType.CsvColumnMappingRequest,
                  content: chatMessages.csvNeedsColumnMapping,
                  metadata: {
                    answered: false,
                    importId: chat.id,
                  },
                })}
                columns={csvColumns}
                mapping={columnMapping}
                isPending={isPending}
                handlers={{
                  onCsvSelected: handleCsvSelected,
                  onColumnMappingChange: handleColumnMappingChange,
                  onReuploadCsv: handleReuploadCsv,
                  onCommentChoice: handleCommentChoice,
                }}
              />
            ) : null
          ) : null}

          {isCommentRequest && !hasPendingStreamMessage ? (
            !hasOpenCommentRequest ? (
              <ChatMessageRenderer
                message={createLocalRequestMessage({
                  id: `local-${chat.id}-comment-request`,
                  chatId: chat.id,
                  type: ChatMessageType.CommentRequest,
                  content: chatMessages.commentRequest,
                  metadata: { answered: false },
                })}
                columns={csvColumns}
                mapping={columnMapping}
                isPending={isPending}
                handlers={{
                  onCsvSelected: handleCsvSelected,
                  onColumnMappingChange: handleColumnMappingChange,
                  onReuploadCsv: handleReuploadCsv,
                  onCommentChoice: handleCommentChoice,
                }}
              />
            ) : null
          ) : null}
        </ConversationContent>

        <ConversationScrollButton />
      </Conversation>
      <div className="shrink-0 bg-background px-4 pt-2 pb-4">
        <ChatComposer
          disabled={isChatInputDisabled}
          placeholder={composerPlaceholder}
          onSubmitAction={handleChatSubmit}
        />
      </div>
    </div>
  );
}

function deriveAnsweredRequestMessages(
  messages: ChatMessage[],
  currentStatus: ChatStatus
): ChatMessage[] {
  return messages.map((message) => {
    if (
      message.type === ChatMessageType.CsvUploadRequest &&
      currentStatus !== ChatStatus.Initialized &&
      currentStatus !== ChatStatus.WaitingForCsvInput &&
      message.metadata.answered !== true
    ) {
      return {
        ...message,
        metadata: {
          ...message.metadata,
          answered: true,
        },
      };
    }

    if (
      message.type === ChatMessageType.CsvColumnMappingRequest &&
      currentStatus !== ChatStatus.NeedsCsvColumnMapping &&
      message.metadata.answered !== true
    ) {
      return {
        ...message,
        metadata: {
          ...message.metadata,
          answered: true,
        },
      };
    }

    if (
      message.type === ChatMessageType.CommentRequest &&
      currentStatus !== ChatStatus.CommentRequest &&
      message.metadata.answered !== true
    ) {
      return {
        ...message,
        metadata: {
          ...message.metadata,
          answered: true,
        },
      };
    }

    return message;
  });
}

function createLocalRequestMessage({
  id,
  chatId,
  type,
  content,
  metadata,
}: {
  id: string;
  chatId: string;
  type:
    | ChatMessageType.CsvUploadRequest
    | ChatMessageType.CsvColumnMappingRequest
    | ChatMessageType.CommentRequest;
  content: string;
  metadata: Record<string, unknown>;
}): ChatMessage {
  return mapDbMessageToChatMessage({
    id,
    chat_id: chatId,
    role: ChatMessageRole.Assistant,
    type,
    content,
    created_at: new Date().toISOString(),
    meta_data: metadata,
  });
}
