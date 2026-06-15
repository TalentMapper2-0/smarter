import { ChatStatus } from "@/types/chat";
import { TurnHandlers } from "@/types/handler";
import { handleInitializedTurn } from "./handlers/initializer";

export const turnHandlers = {
  [ChatStatus.Initialized]: handleInitializedTurn,
  // [ChatStatus.WaitingForAnalysisInput]: handleAnalysisInputTurn,
} satisfies TurnHandlers;