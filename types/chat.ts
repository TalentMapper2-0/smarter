export type MessageFile = {
  id: string;
  messageId: string;
  name: string;
  size: number;
};

export type Chat = {
  id: string;
  title: string;
  userId: string;
  status: ChatStatus;
  messages?: ChatMessage[];
  createdAt: string;
};

export enum ChatStatus {
  Initialized = "initialized",
  WaitingForCsvInput = "waiting_for_csv_input",
  MappingCsvColumns = "mapping_csv_columns",
  NeedsCsvColumnMapping = "needs_csv_column_mapping",
  WaitingForVacancy = "waiting_for_vacancy",
  WaitingForComment = "waiting_for_comment",
  ReadyToClassify = "ready_to_classify",
  ClassifyingCandidates = "classifying_candidates",
  ClassificationComplete = "classification_complete",
  ClassificationFailed = "classification_failed",
}

export enum ChatMessageRole {
  User = "user",
  Assistant = "assistant",
}

export type ChatMessage = {
  id: string;
  chatId: string;
  role: ChatMessageRole;
  content: string | null;
  createdAt?: string;
  files?: MessageFile[];
};

export type RequestMode = "vacancy" | "csv" | "comment" | "ready";

export type VacancyRequestState = {
  title: string;
  vacancy: string;
  csvFile: File | null;
  comment: string;
};
