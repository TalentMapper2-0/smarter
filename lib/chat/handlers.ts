import { ChatStatus } from "@/types/chat";
import { TurnHandlers } from "@/types/handler";
import { handleInitializedTurn } from "./handlers/initializer";
import { handleWaitingForAnalysisInputTurn } from "./handlers/waiting-for-analysis-input";

export const turnHandlers = {
  [ChatStatus.Initialized]: handleInitializedTurn,
  [ChatStatus.WaitingForAnalysisInput]: handleWaitingForAnalysisInputTurn,
} satisfies TurnHandlers;