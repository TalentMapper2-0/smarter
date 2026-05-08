"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Chat, ChatMessageRole } from "@/types/chat";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "../ai-elements/message";
import { TypingMessage } from "./typing";

type Props = {
  chat: Chat;
};

export default function AgentConversation({ chat }: Props) {
  const messages = [
    {
      id: `chat-title-${chat.id}`,
      chatId: chat.id,
      role: ChatMessageRole.User,
      content: chat.title,
    },
    ...(chat.messages ?? []),
  ];

  return (
    <Conversation className="min-h-0 flex-1">
      <ConversationContent>
        {messages.map((message, index) => (
          <Message key={message.id} from={message.role}>
            <MessageContent>
              {index === 1 && message.role === ChatMessageRole.Assistant ? (
                  <TypingMessage text={message.content} />
              ) : (
                <MessageResponse>{message.content}</MessageResponse>
              )}
            </MessageContent>
          </Message>
        ))}
      </ConversationContent>

      <ConversationScrollButton />
    </Conversation>
  );
}
