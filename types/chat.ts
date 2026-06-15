import { ProcessTurnInputSchema } from "@/schemas/input";
import z from "zod";

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
  WaitingForAnalysisInput = "waiting_for_analysis_input",
  // AnalyzingDocuments = "analyzing_documents",
  // NeedsAnalysisFields = "needs_analysis_fields",
  // WaitingForCsvInput = "waiting_for_csv_input",
  // MappingCsvColumns = "mapping_csv_columns",
  // NeedsCsvColumnMapping = "needs_csv_column_mapping",
  // CsvColumnsMatched = "csv_columns_matched",
  // WaitingForVacancy = "waiting_for_vacancy",
  // CommentRequest = "comment_request",
  // WaitingForComment = "waiting_for_comment",
  // ReadyToClassify = "ready_to_classify",
  // ClassifyingCandidates = "classifying_candidates",
  // ClassificationComplete = "classification_complete",
  // ClassificationFailed = "classification_failed",
  // Closed = "closed",
}

export enum ChatMessageType {
  Text = "text",
  AnalysisUploadRequest = "analysis_upload_request",
  AnalysisAttachment = "analysis_attachment",
  AnalysisFieldRequest = "analysis_field_request",
  AnalysisResult = "analysis_result",
  CsvFile = "csv_file",
  CommentRequest = "comment_request",
  ClassificationResult = "classification_result",
  Error = "error",
  CsvColumnMappingRequest = "csv_column_mapping_request",
  CsvUploadRequest = "csv_upload_request",
  EndOfChat = "end_of_chat",
  Unsupported = "unsupported",
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

export type AnalysisFieldKey =
  | "seniority"
  | "region"
  | "must_have_skills"
  | "education"
  | "company_size";

export type AnalysisFieldValue = string | string[] | number | boolean | null;

export type AnalysisFields = Partial<
  Record<AnalysisFieldKey, AnalysisFieldValue>
>;

export type AnalysisAttachmentFile = {
  name: string;
  size: number;
  type: string;
};

export type VacancyRequestState = {
  title: string;
  vacancy: string;
  csvFile: File | null;
  comment: string;
};

export type ChatMessageMetadataByType = {
  [ChatMessageType.Text]: Record<string, unknown>;

  [ChatMessageType.AnalysisUploadRequest]: {
    answered: boolean;
  };

  [ChatMessageType.AnalysisAttachment]: {
    files: AnalysisAttachmentFile[];
    prompt?: string;
  };

  [ChatMessageType.AnalysisFieldRequest]: {
    answered: boolean;
    fields: AnalysisFieldKey[];
    extractedFields: AnalysisFields;
    previousResponseId: string | null;
  };

  [ChatMessageType.AnalysisResult]: {
    fields: AnalysisFields;
    missingFields: AnalysisFieldKey[];
    previousResponseId: string | null;
  };

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

  [ChatMessageType.Unsupported]: Record<string, unknown>;

  [ChatMessageType.EndOfChat]: Record<string, unknown>;
};

export type ProcessTurnInput = z.infer<typeof ProcessTurnInputSchema>;

export type ProcessTurnOutput = {
  message: ChatMessage;
};