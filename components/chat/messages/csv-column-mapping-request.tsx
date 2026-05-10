import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { ChatMessage, ChatMessageRole, ChatMessageType } from "@/types/chat";
import { ChatCsvColumnMapper } from "../chat-csv-column-mapper";
import { ColumnMapping } from "../constants";

export default function CsvColumnMappingRequest({
  message,
  isPending,
  columns,
  mapping,
  onColumnMappingChange,
  onReuploadCsv,
}: {
  message: Extract<
    ChatMessage,
    { type: ChatMessageType.CsvColumnMappingRequest }
  >;
  isPending: boolean;
  columns: string[];
  mapping: ColumnMapping;
  onColumnMappingChange: (mapping: ColumnMapping) => void | Promise<void>;
  onReuploadCsv: () => void | Promise<void>;
}) {
  const answered = message.metadata.answered === true;

  if (answered) {
    return (
      <Message from={ChatMessageRole.Assistant}>
        <MessageContent>
          <MessageResponse>
            {message.content ?? "Kolommen zijn gekoppeld."}
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

      <MessageContent>
        <ChatCsvColumnMapper
          columns={columns}
          mapping={mapping}
          disabled={isPending}
          onChangeAction={(nextMapping) => {
            void onColumnMappingChange(nextMapping);
          }}
          onReuploadAction={() => {
            void onReuploadCsv();
          }}
        />
      </MessageContent>
    </Message>
  );
}
