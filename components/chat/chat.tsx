"use client";

import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { trpc } from "@/trpc/client/client";
import { ChatStatus, Chat as TChat } from "@/types/chat";
import { useEffect, useRef, useState } from "react";
import { ChatComposer, ChatComposerMessage } from "./chat-composer";
import { ChatMessageRenderer } from "./chat-message-renderer";
import ChatInput from "./chat-input";

type Props = {
  chat: TChat;
};

// const ANALYSIS_ATTACHMENT_ACCEPT =
//   ".pdf,.xls,.xlsx,.csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";

export default function Chat({ chat }: Props) {
  const [messages, setMessages] = useState(chat.messages ?? []);
  // const processTurn = trpc.chat.processTurn.useMutation();

  // const hasProcessedInitialTurn = useRef(false);

  // useEffect(() => {
  //   if (chat.status !== ChatStatus.Initialized) return;
  //   if (hasProcessedInitialTurn.current) return;

  //   hasProcessedInitialTurn.current = true;

  //   const runProcessTurn = async () => {
  //     const response = await processTurn.mutateAsync({
  //       chatId: chat.id,
  //     });

  //     setMessages((prev) => [...prev, response]);
  //   };

  //   void runProcessTurn();
  // }, [chat.status, chat.id, processTurn]);

  // async function onSubmit(message: ChatComposerMessage) {
  //   const parts = []
    
  //   const response = await processTurn.mutateAsync({
  //     chatId: chat.id,
  //     userInput: {
  //       parts: [
  //         {
  //           type: "text",
  //           text: message.text,
  //         },
  //       ],
  //     },
  //   });

  //   setMessages((prev) => [...prev, response]);
  // }

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
