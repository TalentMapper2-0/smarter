import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { ChatMessage, ChatMessageRole, ChatMessageType } from "@/types/chat";
import { ChatCsvColumnMapper } from "../chat-csv-column-mapper";
import { ColumnMapping } from "../constants";

export default function CsvColumnMappingRequestMessage({
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
          <MessageResponse>De kolommen zijn al gekoppeld.</MessageResponse>
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
          disabled={isPending}
          mapping={mapping}
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
