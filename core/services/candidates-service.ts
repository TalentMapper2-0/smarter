import { Context } from "@/trpc/server/init";
import CandidatesRepository, {
  type CandidateClassificationResult,
} from "../repositories/candidates-repository";
import ChatsRepository from "../repositories/chats-repository";
import { parsedEnv } from "@/config/env";
import { ChatStatus } from "@/types/chat";

type UploadedCandidateRow = {
  linkedinUrl: string;
  salesNavigatorId: string;
  firstName: string;
  lastName: string;
};

type CreateCandidatesInput = {
  chatId: string;
  vacancyText: string;
  commentText?: string;
  rows: UploadedCandidateRow[];
};

type ClassifyCandidatesInput = {
  chatId: string;
};

type OrchestratorClassifyRequest = {
  service_name: "Classification_Agent";
  payload: {
    profiles_list: string[];
    job_description: string;
    comment: string;
  };
};

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type ClassificationStreamSummary = {
  savedUniqueResultsCount: number;
  failedResultsCount: number;
};

export default class CandidatesService {
  static async findUpload(
    ctx: Context,
    { chatId }: { chatId: string }
  ) {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    const chat = await ChatsRepository.findByIdForUser(ctx, {
      id: chatId,
      userId: ctx.user.id,
    });

    if (!chat) {
      throw new Error("Workspace not found");
    }

    return CandidatesRepository.findUploadByChatId(ctx, { chatId });
  }

  static async listClassificationRows(
    ctx: Context,
    { chatId }: { chatId: string }
  ) {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    const chat = await ChatsRepository.findByIdForUser(ctx, {
      id: chatId,
      userId: ctx.user.id,
    });

    if (!chat) {
      throw new Error("Workspace not found");
    }

    return CandidatesRepository.listClassificationRowsByChatId(ctx, {
      chatId,
    });
  }

  static async create(
    ctx: Context,
    input: CreateCandidatesInput
  ): Promise<void> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    const chat = await ChatsRepository.findByIdForUser(ctx, {
      id: input.chatId,
      userId: ctx.user.id,
    });

    if (!chat) {
      throw new Error("Workspace not found");
    }

    if (
      chat.status !== ChatStatus.NeedsCsvColumnMapping &&
      chat.status !== ChatStatus.ReadyToClassify &&
      chat.status !== ChatStatus.WaitingForVacancy
    ) {
      throw new Error(
        "This upload can no longer be changed because the next step has already processed the data."
      );
    }

    await CandidatesRepository.create(ctx, input);
    await ChatsRepository.updateStatusForUser(ctx, {
      id: input.chatId,
      userId: ctx.user.id,
      status: ChatStatus.ReadyToClassify,
    });
  }

  static async startClassification(
    ctx: Context,
    input: ClassifyCandidatesInput
  ): Promise<{ flowStage: ChatStatus }> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    const chat = await ChatsRepository.findByIdForUser(ctx, {
      id: input.chatId,
      userId: ctx.user.id,
    });

    if (!chat) {
      throw new Error("Workspace not found");
    }

    if (
      chat.status !== ChatStatus.ReadyToClassify &&
      chat.status !== ChatStatus.ClassificationFailed
    ) {
      throw new Error("This chat is not ready to classify.");
    }

    const upload = await CandidatesRepository.findUploadByChatId(ctx, {
      chatId: input.chatId,
    });

    if (!upload) {
      throw new Error("No uploaded candidates found.");
    }

    const profilesList = upload.rows
      .map((row) => row.linkedinUrl.trim())
      .filter(Boolean);

    if (!profilesList.length) {
      throw new Error("No LinkedIn profile URLs found.");
    }

    await CandidatesRepository.markClassificationStarted(ctx, {
      chatId: input.chatId,
    });

    await ChatsRepository.updateStatusForUser(ctx, {
      id: input.chatId,
      userId: ctx.user.id,
      status: ChatStatus.ClassifyingCandidates,
    });

    return { flowStage: ChatStatus.ClassifyingCandidates };
  }

  static async runClassification(
    ctx: Context,
    input: ClassifyCandidatesInput
  ): Promise<{ flowStage: ChatStatus }> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    const chat = await ChatsRepository.findByIdForUser(ctx, {
      id: input.chatId,
      userId: ctx.user.id,
    });

    if (!chat) {
      throw new Error("Workspace not found");
    }

    if (chat.status !== ChatStatus.ClassifyingCandidates) {
      throw new Error("This chat is not currently classifying.");
    }

    const upload = await CandidatesRepository.findUploadByChatId(ctx, {
      chatId: input.chatId,
    });

    if (!upload) {
      throw new Error("No uploaded candidates found.");
    }

    const profilesList = upload.rows
      .map((row) => row.linkedinUrl.trim())
      .filter(Boolean);

    if (!profilesList.length) {
      throw new Error("No LinkedIn profile URLs found.");
    }

    const requestBody: OrchestratorClassifyRequest = {
      service_name: "Classification_Agent",
      payload: {
        profiles_list: profilesList,
        job_description: upload.vacancyText,
        comment: upload.commentText,
      },
    };

    try {
      const response = await fetch(
        `${parsedEnv.ORCHESTRATOR_URL}/orchestrate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream, application/json, text/plain",
            Authorization: `Bearer ${parsedEnv.ORCHESTRATOR_API_KEY}`,
            "x-api-key": parsedEnv.ORCHESTRATOR_API_KEY,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const responseText = await response.text().catch(() => "");
        throw new Error(
          `Orchestrator classify failed with ${response.status}: ${responseText}`
        );
      }

      const { savedUniqueResultsCount, failedResultsCount } =
        await this.readAndSaveOrchestratorClassificationResults(
          response,
          profilesList,
          async (result) => {
            await CandidatesRepository.saveClassificationResults(ctx, {
              chatId: input.chatId,
              results: [result],
            });
          }
        );

      await CandidatesRepository.markPendingClassificationFailed(ctx, {
        chatId: input.chatId,
      });

      const finalStatus =
        savedUniqueResultsCount || failedResultsCount
          ? ChatStatus.ClassificationComplete
          : ChatStatus.ClassificationFailed;

      await ChatsRepository.updateStatusForUser(ctx, {
        id: input.chatId,
        userId: ctx.user.id,
        status: finalStatus,
      });

      if (!savedUniqueResultsCount && !failedResultsCount) {
        throw new Error("No candidate classification results returned.");
      }

      return { flowStage: finalStatus };
    } catch (error) {
      await CandidatesRepository.markPendingClassificationFailed(ctx, {
        chatId: input.chatId,
      });

      await ChatsRepository.updateStatusForUser(ctx, {
        id: input.chatId,
        userId: ctx.user.id,
        status: ChatStatus.ClassificationFailed,
      });

      throw error;
    }
  }

  private static async readAndSaveOrchestratorClassificationResults(
    response: Response,
    profilesList: string[],
    saveResult: (result: CandidateClassificationResult) => Promise<void>
  ): Promise<ClassificationStreamSummary> {
    const savedResultFingerprintsByUrl = new Map<string, string>();
    let savedUniqueResultsCount = 0;
    let failedResultsCount = 0;

    const saveEventResults = async (event: JsonValue): Promise<void> => {
      const candidates = this.findCandidateArray(event);

      for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        const fallbackLinkedinUrl =
          candidates.length === 1
            ? profilesList[savedUniqueResultsCount]
            : profilesList[index];
        const result = this.toClassificationResult(
          candidate,
          fallbackLinkedinUrl
        );

        if (!result) {
          continue;
        }

        const resultFingerprint =
          this.toClassificationResultFingerprint(result);

        if (
          savedResultFingerprintsByUrl.get(result.linkedinUrl) ===
          resultFingerprint
        ) {
          continue;
        }

        const isFirstSaveForCandidate = !savedResultFingerprintsByUrl.has(
          result.linkedinUrl
        );

        try {
          await saveResult(result);
          savedResultFingerprintsByUrl.set(
            result.linkedinUrl,
            resultFingerprint
          );

          if (isFirstSaveForCandidate) {
            savedUniqueResultsCount += 1;
          }
        } catch (error) {
          failedResultsCount += 1;
          console.error("Failed to save classification result", {
            error,
            linkedinUrl: result.linkedinUrl,
          });
        }
      }
    };

    if (!response.body) {
      const responseText = await response.text();
      const parsed = this.parseJsonText(responseText);

      if (parsed) {
        await saveEventResults(parsed);
      }

      return {
        savedUniqueResultsCount,
        failedResultsCount,
      };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let bufferedText = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      bufferedText += decoder.decode(value, { stream: true });
      const eventBlocks = bufferedText.split(/\r?\n\r?\n/);
      bufferedText = eventBlocks.pop() ?? "";

      for (const eventBlock of eventBlocks) {
        const parsed = this.parseOrchestratorEventBlock(eventBlock);

        if (parsed) {
          await saveEventResults(parsed);
        }
      }
    }

    const finalText = `${bufferedText}${decoder.decode()}`.trim();

    if (finalText) {
      const parsed = this.parseOrchestratorEventBlock(finalText);

      if (parsed) {
        await saveEventResults(parsed);
      }
    }

    return {
      savedUniqueResultsCount,
      failedResultsCount,
    };
  }

  private static toClassificationResultFingerprint(
    result: CandidateClassificationResult
  ): string {
    return JSON.stringify({
      explanation: result.explanation,
      label: result.label,
      status: result.status,
    });
  }

  private static parseOrchestratorEventBlock(
    eventBlock: string
  ): JsonValue | null {
    const lines = eventBlock
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      return null;
    }

    const eventName = lines
      .find((line) => line.startsWith("event:"))
      ?.slice("event:".length)
      .trim()
      .toLowerCase();
    const dataLines = lines
      .filter((line) => !line.startsWith("event:") && !line.startsWith(":"))
      .map((line) =>
        line.startsWith("data:") ? line.slice("data:".length).trim() : line
      );

    const dataText = dataLines.join("\n");

    if (!dataText || dataText === "[DONE]") {
      return null;
    }

    const parsed = this.parseJsonText(dataText);

    if (eventName === "error" && this.isJsonObject(parsed)) {
      return {
        ...parsed,
        event: parsed.event ?? "error",
      };
    }

    return parsed;
  }

  private static parseJsonText(text: string): JsonValue | null {
    try {
      return JSON.parse(text) as JsonValue;
    } catch {
      return null;
    }
  }

  private static findCandidateArray(value: JsonValue): JsonValue[] {
    if (typeof value === "string") {
      const parsed = this.parseJsonText(value);
      return parsed ? this.findCandidateArray(parsed) : [];
    }

    if (Array.isArray(value)) {
      return value;
    }

    if (!this.isJsonObject(value)) {
      return [];
    }

    if (this.isCandidateResultObject(value)) {
      return [value];
    }

    const candidateKeys = [
      "candidates",
      "classifications",
      "results",
      "profiles",
      "data",
      "payload",
      "output",
      "result",
      "candidate",
    ];

    for (const key of candidateKeys) {
      const nestedValue = value[key];

      if (!nestedValue) {
        continue;
      }

      const candidates = this.findCandidateArray(nestedValue);

      if (candidates.length) {
        return candidates;
      }
    }

    const objectValues = Object.values(value);
    const candidateValues = objectValues.filter((item) =>
      this.isCandidateResultObject(item)
    );

    if (candidateValues.length) {
      return candidateValues;
    }

    return [];
  }

  private static toClassificationResult(
    value: JsonValue,
    fallbackLinkedinUrl: string | undefined
  ): CandidateClassificationResult | null {
    if (!this.isJsonObject(value)) {
      return null;
    }

    const linkedinUrl =
      this.getStringField(value, [
        "linkedin_url",
        "linkedinUrl",
        "profile_url",
        "profileUrl",
        "profile",
        "url",
        "linkedin",
      ]) ?? fallbackLinkedinUrl;

    if (!linkedinUrl) {
      return null;
    }

    const rawStatus = this.getStringField(value, ["status", "state"]);
    const isErrorResult =
      this.hasErrorField(value) ||
      this.isErrorMarker(this.getStringField(value, ["type", "event"]));

    return {
      linkedinUrl,
      label:
        this.getStringField(value, [
          "label",
          "classification",
          "category",
          "decision",
          "result",
        ]) ?? "",
      explanation:
        this.getStringField(value, [
          "explanation",
          "reason",
          "rationale",
          "summary",
          "motivation",
          "error",
          "message",
          "detail",
          "details",
        ]) ?? (isErrorResult ? "Profiel kon niet worden geclassificeerd." : ""),
      status: this.toCandidateStatus(rawStatus, isErrorResult),
    };
  }

  private static toCandidateStatus(
    status: string | null,
    isErrorResult: boolean
  ): string {
    const normalizedStatus = status?.trim().toLowerCase();

    if (
      normalizedStatus === "error" ||
      normalizedStatus === "errored" ||
      normalizedStatus === "failure" ||
      normalizedStatus === "failed"
    ) {
      return "failed";
    }

    return status ?? (isErrorResult ? "failed" : "classified");
  }

  private static getStringField(
    value: Record<string, JsonValue>,
    keys: string[]
  ): string | null {
    for (const key of keys) {
      const fieldValue = value[key];

      if (typeof fieldValue === "string" && fieldValue.trim()) {
        return fieldValue.trim();
      }
    }

    return null;
  }

  private static isJsonObject(
    value: JsonValue
  ): value is Record<string, JsonValue> {
    return Boolean(value) && !Array.isArray(value) && typeof value === "object";
  }

  private static hasErrorField(value: Record<string, JsonValue>): boolean {
    return ["error", "errors", "exception", "traceback"].some((key) =>
      Boolean(value[key])
    );
  }

  private static isErrorMarker(value: string | null): boolean {
    return value?.trim().toLowerCase() === "error";
  }

  private static isCandidateResultObject(value: JsonValue): boolean {
    if (!this.isJsonObject(value)) {
      return false;
    }

    const profileUrl = this.getStringField(value, [
      "linkedin_url",
      "linkedinUrl",
      "profile_url",
      "profileUrl",
      "profile",
      "url",
      "linkedin",
    ]);

    const classification = this.getStringField(value, [
      "label",
      "classification",
      "category",
      "decision",
    ]);

    return Boolean(profileUrl || classification);
  }
}
