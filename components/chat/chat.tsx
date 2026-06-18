"use client";

import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { Chat as TChat } from "@/types/chat";
import { useState } from "react";
import ChatInput from "./chat-input";
import { ChatMessageRenderer } from "./chat-message-renderer";

type Props = {
  chat: TChat;
};

export default function Chat({ chat }: Props) {
  const [messages, setMessages] = useState(chat.messages ?? []);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="pb-6">
          {messages.map((message) => (
            <ChatMessageRenderer key={message.id} message={message} />
          ))}
        </ConversationContent>
      </Conversation>
      <div className="sticky bottom-0 z-10 shrink-0 bg-background px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <ChatInput chat={chat} />
      </div>
    </div>
  );
}
