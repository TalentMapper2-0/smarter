"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Spinner } from "@/components/ui/spinner";
import { messages as chatMessages } from "@/lib/chat/messages";
import { trpc } from "@/trpc/client/client";
import { Chat, ChatMessageRole, ChatStatus } from "@/types/chat";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "../ai-elements/message";
import { ChatComposer } from "./chat-composer";
import { ChatCsvColumnMapper } from "./chat-csv-column-mapper";
import { ChatCsvDropzone, type ChatSelectedCsvFile } from "./chat-csv-dropzone";
import { ColumnMapping, REQUIRED_FIELDS } from "./constants";
import { createEmptyMapping, parseCsv, suggestMapping } from "./csv-utils";

type Props = {
  chat: Chat;
};

export default function AgentConversation({ chat }: Props) {
  const router = useRouter();
  const updateChatStatus = trpc.chat.updateStatus.useMutation();
  const reuploadCsv = trpc.chat.reuploadCsv.useMutation();
  const saveMappedCsv = trpc.chat.saveMappedCsv.useMutation();
  const uploadCsvMetadata = trpc.chat.uploadCsvMetadata.useMutation();
  const [streamedInitialMessage, setStreamedInitialMessage] = useState({
    chatId: chat.id,
    content: "",
  });
  const [optimisticStatus, setOptimisticStatus] = useState<{
    chatId: string;
    status: ChatStatus;
  } | null>(null);
  const [selectedCsvFileState, setSelectedCsvFileState] = useState<{
    chatId: string;
    file: ChatSelectedCsvFile;
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
    rows: any[];
  } | null>(null);
  const shouldStreamInitialMessage = (chat.messages?.length ?? 0) === 0;
  const initialMessageContent =
    streamedInitialMessage.chatId === chat.id
      ? streamedInitialMessage.content
      : "";
  const currentStatus =
    optimisticStatus?.chatId === chat.id
      ? optimisticStatus.status
      : chat.status;
  const selectedCsvFile =
    selectedCsvFileState?.chatId === chat.id
      ? selectedCsvFileState.file
      : null;
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
  const isCsvColumnsMapped = currentStatus === ChatStatus.CsvColumnsMapped;
  const isChatInputDisabled =
    shouldStreamInitialMessage ||
    isWaitingForCsvInput ||
    isMappingCsvColumns ||
    isNeedsCsvColumnMapping ||
    isCsvColumnsMapped;
  const messages = [
    {
      id: `chat-title-${chat.id}`,
      chatId: chat.id,
      role: ChatMessageRole.User,
      content: chat.title,
    },
    ...(shouldStreamInitialMessage
      ? [
          {
            id: `chat-initial-message-${chat.id}`,
            chatId: chat.id,
            role: ChatMessageRole.Assistant,
            content: initialMessageContent,
          },
        ]
      : []),
    ...(chat.messages ?? []),
  ];

  useEffect(() => {
    if (!shouldStreamInitialMessage) {
      return;
    }

    const abortController = new AbortController();
    const appendStreamedInitialMessage = (chunk: string) => {
      startTransition(() => {
        setStreamedInitialMessage((currentMessage) => {
          if (currentMessage.chatId !== chat.id) {
            return {
              chatId: chat.id,
              content: chunk,
            };
          }

          return {
            chatId: chat.id,
            content: currentMessage.content + chunk,
          };
        });
      });
    };

    const streamInitialMessage = async () => {
      try {
        const response = await fetch(`/api/chats/${chat.id}/stream`, {
          method: "POST",
          signal: abortController.signal,
        });

        if (response.status === 204) {
          router.refresh();
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to stream initial chat message");
        }

        if (!response.body) {
          throw new Error("Initial chat message stream is empty");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });

          if (chunk) {
            appendStreamedInitialMessage(chunk);
          }
        }

        const remainingChunk = decoder.decode();

        if (remainingChunk) {
          appendStreamedInitialMessage(remainingChunk);
        }

        router.refresh();
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Failed to stream initial chat message", error);
      }
    };

    void streamInitialMessage();

    return () => {
      abortController.abort();
    };
  }, [chat.id, router, shouldStreamInitialMessage]);

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
      const nextStatus = allFieldsMapped
        ? ChatStatus.CsvColumnsMapped
        : ChatStatus.NeedsCsvColumnMapping;

      await uploadCsvMetadata.mutateAsync({
        chatId: chat.id,
        fileName: file.name,
        fileSize: file.size,
      });

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
        status: nextStatus,
      });

      await updateChatStatus.mutateAsync({
        id: chat.id,
        status: nextStatus,
      });
    } catch (error) {
      setSelectedCsvFileState(null);
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

    const nextStatus = ChatStatus.CsvColumnsMapped;

    setOptimisticStatus({
      chatId: chat.id,
      status: nextStatus,
    });

    try {
      const rowsToSave = (csvRowsState?.chatId === chat.id ? csvRowsState.rows : []).map((row) => {
        const mappedRow: Record<string, any> = {};
        for (const field of REQUIRED_FIELDS) {
          mappedRow[field] = row[nextMapping[field]];
        }
        return mappedRow;
      });

      await saveMappedCsv.mutateAsync({
        chatId: chat.id,
        fileName: selectedCsvFile?.name ?? "onbekend.csv",
        fileSize: selectedCsvFile?.size ?? 0,
        mappedRows: rowsToSave,
      });

      setSelectedCsvFileState(null);
      setCsvColumnsState(null);
      setColumnMappingState(null);
      setCsvRowsState(null);
      
      router.refresh();
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
      await reuploadCsv.mutateAsync({
        chatId: chat.id,
        fileName: selectedCsvFile.name,
        fileSize: selectedCsvFile.size,
      });

      setSelectedCsvFileState(null);
      setCsvColumnsState(null);
      setColumnMappingState(null);
      setCsvRowsState(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to reupload csv", error);
      setOptimisticStatus({
        chatId: chat.id,
        status: ChatStatus.NeedsCsvColumnMapping,
      });
    }
  };

  const handleChatSubmit = async () => {};

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {chat.status}
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {messages.map((message, index) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {shouldStreamInitialMessage &&
                index === 1 &&
                message.role === ChatMessageRole.Assistant ? (
                  <MessageResponse isAnimating>
                    {message.content}
                  </MessageResponse>
                ) : (
                  <MessageResponse>{message.content}</MessageResponse>
                )}

                {message.files?.map((file) => (
                  <ChatCsvDropzone key={file.id} selectedFile={file} />
                ))}

                {isWaitingForCsvInput &&
                index === messages.length - 1 &&
                message.role === ChatMessageRole.Assistant ? (
                  <ChatCsvDropzone
                    isUploading={updateChatStatus.isPending}
                    onCsvSelectedAction={handleCsvSelected}
                  />
                ) : null}
              </MessageContent>
            </Message>
          ))}

          {selectedCsvFile ? (
            <Message from={ChatMessageRole.Assistant}>
              <MessageContent>
                <ChatCsvDropzone selectedFile={selectedCsvFile} />
              </MessageContent>
            </Message>
          ) : null}

          {isMappingCsvColumns ? (
            <Message from={ChatMessageRole.Assistant}>
              <MessageContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-4" />
                  <span>Thinking...</span>
                </div>
              </MessageContent>
            </Message>
          ) : null}

          {isNeedsCsvColumnMapping ? (
            <Message from={ChatMessageRole.Assistant}>
              <MessageContent>
                <MessageResponse>
                  {chatMessages.csvNeedsColumnMapping}
                </MessageResponse>
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

          {isCsvColumnsMapped ? (
            <Message from={ChatMessageRole.Assistant}>
              <MessageContent>
                <MessageResponse>
                  {chatMessages.csvColumnsMatched}
                </MessageResponse>
              </MessageContent>
            </Message>
          ) : null}
        </ConversationContent>

        <ConversationScrollButton />
      </Conversation>
      <div className="shrink-0 bg-background px-4 pt-2 pb-4">
        <ChatComposer
          disabled={isChatInputDisabled}
          placeholder={
            isWaitingForCsvInput
              ? "Upload een CSV-bestand om door te gaan"
              : isMappingCsvColumns
                ? "Kolommen worden gecontroleerd"
                : isNeedsCsvColumnMapping
                  ? "Koppel eerst de CSV-kolommen"
                  : isCsvColumnsMapped
                    ? "Kolommen zijn gekoppeld"
                    : "Stuur een bericht"
          }
          onSubmitAction={handleChatSubmit}
        />
      </div>
    </div>
  );
}
