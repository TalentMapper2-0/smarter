"use client"

import { Chat, ChatStatus } from "@/types/chat"
import { DisabledChatComposer } from "./inputs/disabled-chat-composer"

export default function ChatInput({ chat }: { chat: Chat }) {
  switch (chat.status) {
    case ChatStatus.Initialized:
      return <DisabledChatComposer />
    default:
      return <DisabledChatComposer />
  }
}
