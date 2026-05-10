import { Confirmation, ConfirmationTitle, ConfirmationRequest, ConfirmationActions, ConfirmationAction } from "@/components/ai-elements/confirmation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { ChatMessage, ChatMessageType, ChatMessageRole } from "@/types/chat";

export default function CommentRequestMessage({
  message,
  isPending,
  onCommentChoice,
}: {
  message: Extract<ChatMessage, { type: ChatMessageType.CommentRequest }>;
  isPending: boolean;
  onCommentChoice: (wantsComment: boolean) => void | Promise<void>;
}) {
  const answered = message.metadata.answered === true;
  const answer = message.metadata.answer;

  return (
    <Message from={ChatMessageRole.Assistant}>
      <MessageContent className="w-full max-w-xl">
        <Confirmation
          approval={{ id: `${message.id}-comment-request` }}
          state={answered ? "approval-responded" : "approval-requested"}
        >
          <ConfirmationTitle>
            <ConfirmationRequest>
              {message.content ?? "Wil je nog opmerkingen toevoegen?"}
            </ConfirmationRequest>
          </ConfirmationTitle>

          <ConfirmationActions>
            <ConfirmationAction
              disabled={answered || isPending}
              onClick={() => {
                void onCommentChoice(false);
              }}
              variant={answered && answer === false ? "default" : "outline"}
            >
              Nee
            </ConfirmationAction>

            <ConfirmationAction
              disabled={answered || isPending}
              onClick={() => {
                void onCommentChoice(true);
              }}
              variant={answered && answer === true ? "default" : "outline"}
            >
              Ja
            </ConfirmationAction>
          </ConfirmationActions>
        </Confirmation>
      </MessageContent>
    </Message>
  );
}