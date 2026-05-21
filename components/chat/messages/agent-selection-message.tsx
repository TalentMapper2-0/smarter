"use client";

import { Message, MessageContent } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { messages as chatMessages } from "@/lib/chat/messages";
import { ChatMessage, ChatMessageRole } from "@/types/chat";

export type AgentChoice = "SourcingAgent" | "AnalysisAgent";

const agentOptions = [
  {
    agent: "SourcingAgent",
    description: "starts the sourcing flow.",
  },
  {
    agent: "AnalysisAgent",
    description: "starts the analysis flow.",
  },
] satisfies {
  agent: AgentChoice;
  description: string;
}[];

export default function AgentSelectionMessage({
  message,
  disabled,
  onAgentChoice,
}: {
  message: ChatMessage;
  disabled: boolean;
  onAgentChoice: (agent: AgentChoice) => void | Promise<void>;
}) {
  return (
    <Message from={ChatMessageRole.Assistant}>
      <MessageContent className="w-full max-w-xl">
        <div className="flex flex-col gap-3">
          <p>{message.content ?? chatMessages.agentSelectionRequest}</p>

          <div className="flex flex-col gap-2">
            {agentOptions.map((option) => (
              <Button
                className="h-auto justify-start whitespace-normal px-3 py-2 text-left"
                disabled={disabled}
                key={option.agent}
                onClick={() => {
                  void onAgentChoice(option.agent);
                }}
                type="button"
                variant="outline"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="font-medium">{option.agent}</span>
                  <span className="text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </div>
      </MessageContent>
    </Message>
  );
}
