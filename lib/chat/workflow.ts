import { ChatStatus } from "@/types/chat";
import type { MessageKey } from "./messages";

export type ChatStatusAction =
  | "start_chat"
  | "upload_csv"
  | "map_csv_columns"
  | "save_vacancy"
  | "confirm_comment"
  | "save_comment"
  | "classify_candidates"
  | "none";

export type ChatStatusStep = {
  action: ChatStatusAction;
  expectsUserInput: boolean;
  messageKey?: MessageKey;
  nextStatus?: ChatStatus;
};

export const chatStatusFlow = {
  [ChatStatus.Initialized]: {
    action: "start_chat",
    expectsUserInput: false,
    messageKey: "chatInitialized",
    nextStatus: ChatStatus.WaitingForCsvInput,
  },
  [ChatStatus.WaitingForCsvInput]: {
    action: "upload_csv",
    expectsUserInput: true,
    nextStatus: ChatStatus.MappingCsvColumns,
  },
  [ChatStatus.MappingCsvColumns]: {
    action: "map_csv_columns",
    expectsUserInput: false,
    nextStatus: ChatStatus.CsvColumnsMatched,
  },
  [ChatStatus.NeedsCsvColumnMapping]: {
    action: "map_csv_columns",
    expectsUserInput: true,
    messageKey: "csvNeedsColumnMapping",
    nextStatus: ChatStatus.CsvColumnsMatched,
  },
  [ChatStatus.CsvColumnsMatched]: {
    action: "none",
    expectsUserInput: false,
    messageKey: "csvColumnsMatched",
    nextStatus: ChatStatus.WaitingForVacancy,
  },
  [ChatStatus.WaitingForVacancy]: {
    action: "save_vacancy",
    expectsUserInput: true,
    messageKey: "vacancyRequest",
    nextStatus: ChatStatus.CommentRequest,
  },
  [ChatStatus.CommentRequest]: {
    action: "confirm_comment",
    expectsUserInput: true,
    messageKey: "commentRequest",
  },
  [ChatStatus.WaitingForComment]: {
    action: "save_comment",
    expectsUserInput: true,
    messageKey: "commentTextRequest",
    nextStatus: ChatStatus.ReadyToClassify,
  },
  [ChatStatus.ReadyToClassify]: {
    action: "classify_candidates",
    expectsUserInput: false,
    messageKey: "readyToClassify",
  },
  [ChatStatus.ClassifyingCandidates]: {
    action: "none",
    expectsUserInput: false,
  },
  [ChatStatus.ClassificationComplete]: {
    action: "none",
    expectsUserInput: false,
  },
  [ChatStatus.ClassificationFailed]: {
    action: "none",
    expectsUserInput: true,
  },
  [ChatStatus.Closed]: {
    action: "none",
    expectsUserInput: false,
    messageKey: "chatClosed",
  },
} satisfies Record<ChatStatus, ChatStatusStep>;

export function getChatStatusStep(status: ChatStatus): ChatStatusStep {
  return chatStatusFlow[status];
}

export function getNextStatusAfterInput(status: ChatStatus) {
  return getChatStatusStep(status).nextStatus;
}

export function getNextStatusAfterStatusMessage(status: ChatStatus) {
  const step = getChatStatusStep(status);

  if (step.expectsUserInput) {
    return undefined;
  }

  return step.nextStatus;
}
