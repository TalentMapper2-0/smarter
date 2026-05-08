export type Chat = {
  id: string;
  title: string;
  userId: string;
  status: ChatStatus;
  messages?: ChatMessage[];
}

export enum ChatStatus {
  Initialized = "initialized", 
}

export enum ChatMessageRole {
  User = "user",
  Assistant = "assistant",
}

export type ChatMessage = {
  id: string;
  chatId: string;
  role: ChatMessageRole;
  content: string;
}