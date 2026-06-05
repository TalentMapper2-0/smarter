import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Badge } from "@/components/ui/badge";
import {
  formatAnalysisFieldList,
  getAnalysisFieldLabel,
} from "@/lib/chat/analysis";
import { ChatMessage, ChatMessageRole, ChatMessageType } from "@/types/chat";

export default function AnalysisFieldRequestMessage({
  message,
}: {
  message: Extract<ChatMessage, { type: ChatMessageType.AnalysisFieldRequest }>;
}) {
  const fields = message.metadata.fields;
  const answered = message.metadata.answered === true;

  return (
    <Message from={ChatMessageRole.Assistant}>
      <MessageContent className="w-full max-w-xl">
        <div className="flex flex-col gap-3">
          <MessageResponse>
            {answered
              ? `Ontbrekende velden aangevuld: ${formatAnalysisFieldList(
                  fields
                )}.`
              : (message.content ??
                `Ik mis nog: ${formatAnalysisFieldList(
                  fields
                )}. Vul die aan in de chat.`)}
          </MessageResponse>

          <div className="flex flex-wrap gap-2">
            {fields.map((field) => (
              <Badge key={field} variant={answered ? "secondary" : "outline"}>
                {getAnalysisFieldLabel(field)}
              </Badge>
            ))}
          </div>
        </div>
      </MessageContent>
    </Message>
  );
}
