import { JsonObject } from "./json";

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
  CsvColumnsMatched = "csv_columns_matched",
  WaitingForVacancy = "waiting_for_vacancy",
  CommentRequest = "comment_request",
  WaitingForComment = "waiting_for_comment",
  ReadyToClassify = "ready_to_classify",
  ClassifyingCandidates = "classifying_candidates",
  ClassificationComplete = "classification_complete",
  ClassificationFailed = "classification_failed",
  Closed = "closed",
}

export enum ChatMessageType {
  Text = "text",
  CsvFile = "csv_file",
  CommentRequest = "comment_request",
  ClassificationResult = "classification_result",
  Error = "error",
  CsvColumnMappingRequest = "csv_column_mapping_request",
  CsvUploadRequest = "csv_upload_request",
  EndOfChat = "end_of_chat",
}

export enum ChatMessageRole {
  User = "user",
  Assistant = "assistant",
}

export type ChatMessage = {
  [Type in ChatMessageType]: {
    id: string;
    chatId: string;
    role: ChatMessageRole;
    type: Type;
    content: string | null;
    metadata: ChatMessageMetadataByType[Type];
    createdAt: string;
  };
}[ChatMessageType];

export type RequestMode = "vacancy" | "csv" | "comment" | "ready";

export type VacancyRequestState = {
  title: string;
  vacancy: string;
  csvFile: File | null;
  comment: string;
};

export type ChatMessageMetadataByType = {
  [ChatMessageType.Text]: Record<string, never>;

  [ChatMessageType.CsvFile]: {
    fileName: string;
    fileSize: number;
  };

  [ChatMessageType.CsvColumnMappingRequest]: {
    answered: boolean;
    importId: string;
  };

  [ChatMessageType.CommentRequest]: {
    answered: boolean;
    answer?: boolean;
  };

  [ChatMessageType.ClassificationResult]: {
    runId: string;
  };

  [ChatMessageType.CsvUploadRequest]: {
    answered: boolean;
  };

  [ChatMessageType.Error]: {
    code?: string;
    retryable?: boolean;
  };
};
