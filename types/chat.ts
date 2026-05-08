export type Chat = {
  id: string;
  title: string;
  userId: string;
  status: ChatStatus;
  messages?: ChatMessage[];
};

export enum ChatStatus {
  Initialized = "initialized",
  WaitingForCsvInput = "waiting_for_csv_input",
  MappingCsvColumns = "mapping_csv_columns",
  NeedsCsvColumnMapping = "needs_csv_column_mapping",
  CsvColumnsMapped = "csv_columns_mapped",
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
};

export type RequestMode = "vacancy" | "csv" | "comment" | "ready";

export type VacancyRequestState = {
  title: string;
  vacancy: string;
  csvFile: File | null;
  comment: string;
};
