import { Context } from "@/trpc/server/init";
import type { CandidateClassificationRow } from "@/types/candidate";
import "server-only";

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

export type CandidateClassificationResult = {
  linkedinUrl: string;
  fullName: string;
  label: string;
  explanation: string;
  status: string;
};

export type UploadedCandidateData = {
  vacancyText: string;
  commentText: string;
  rows: UploadedCandidateRow[];
};

export default class CandidatesRepository {
  static async findUploadByChatId(
    ctx: Context,
    { chatId }: { chatId: string }
  ): Promise<UploadedCandidateData | null> {
    const { supabase } = ctx;

    const { data: vacancyRows, error: vacancyError } = await supabase
      .from("classify_vacancies")
      .select("vacancy_text")
      .eq("chat_id", chatId)
      .limit(1);

    if (vacancyError) {
      throw vacancyError;
    }

    const { data: commentRows, error: commentError } = await supabase
      .from("classify_comments")
      .select("comment_text")
      .eq("chat_id", chatId)
      .limit(1);

    if (commentError) {
      throw commentError;
    }

    const { data: candidateRows, error: candidateError } = await supabase
      .from("classify_candidates")
      .select("linkedin_url,sales_navigator_id,first_name,last_name")
      .eq("chat_id", chatId);

    if (candidateError) {
      throw candidateError;
    }

    if (!vacancyRows?.length && !candidateRows?.length) {
      return null;
    }

    return {
      vacancyText: vacancyRows?.[0]?.vacancy_text ?? "",
      commentText: commentRows?.[0]?.comment_text ?? "",
      rows: (candidateRows ?? []).map((row) => {
        return {
          linkedinUrl: row.linkedin_url ?? "",
          salesNavigatorId: row.sales_navigator_id ?? "",
          firstName: row.first_name ?? "",
          lastName: row.last_name ?? "",
        };
      }),
    };
  }

  static async create(
    ctx: Context,
    { chatId, rows, vacancyText, commentText }: CreateCandidatesInput
  ): Promise<void> {
    const { supabase } = ctx;
    const candidateRows = rows.map((row) => ({
      linkedin_url: row.linkedinUrl,
      sales_navigator_id: row.salesNavigatorId,
      first_name: row.firstName,
      last_name: row.lastName,
      chat_id: chatId,
    }));

    const { error: deleteCommentsError } = await supabase
      .from("classify_comments")
      .delete()
      .eq("chat_id", chatId);

    if (deleteCommentsError) {
      throw deleteCommentsError;
    }

    const { error: deleteVacanciesError } = await supabase
      .from("classify_vacancies")
      .delete()
      .eq("chat_id", chatId);

    if (deleteVacanciesError) {
      throw deleteVacanciesError;
    }

    const { error: deleteCandidatesError } = await supabase
      .from("classify_candidates")
      .delete()
      .eq("chat_id", chatId);

    if (deleteCandidatesError) {
      throw deleteCandidatesError;
    }

    const { error } = await supabase
      .from("classify_candidates")
      .insert(candidateRows);

    if (error) {
      throw error;
    }

    const { error: vacancyError } = await supabase
      .from("classify_vacancies")
      .insert({
        vacancy_text: vacancyText,
        chat_id: chatId,
      });

    if (vacancyError) {
      throw vacancyError;
    }

    if (commentText) {
      const { error: commentError } = await supabase
        .from("classify_comments")
        .insert({
          comment_text: commentText,
          chat_id: chatId,
        });

      if (commentError) {
        throw commentError;
      }
    }
  }

  static async listClassificationRowsByChatId(
    ctx: Context,
    { chatId }: { chatId: string }
  ): Promise<CandidateClassificationRow[]> {
    const { supabase } = ctx;

    const { data, error } = await supabase
      .from("classify_candidates")
      .select(
        "id,linkedin_url,sales_navigator_id,first_name,last_name,label,explanation,status"
      )
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      linkedinUrl: row.linkedin_url ?? "",
      salesNavigatorId: row.sales_navigator_id ?? "",
      firstName: row.first_name ?? "",
      lastName: row.last_name ?? "",
      label: row.label ?? "",
      explanation: row.explanation ?? "",
      status: row.status ?? "",
    }));
  }

  static async markClassificationStarted(
    ctx: Context,
    { chatId }: { chatId: string }
  ): Promise<void> {
    const { supabase } = ctx;

    const { error } = await supabase
      .from("classify_candidates")
      .update({
        explanation: null,
        label: null,
        status: "classifying",
      })
      .eq("chat_id", chatId);

    if (error) {
      throw error;
    }
  }

  static async markPendingClassificationFailed(
    ctx: Context,
    { chatId }: { chatId: string }
  ): Promise<void> {
    const { supabase } = ctx;

    const { error } = await supabase
      .from("classify_candidates")
      .update({
        status: "failed",
      })
      .eq("chat_id", chatId)
      .eq("status", "classifying");

    if (error) {
      throw error;
    }
  }

  static async saveClassificationResults(
    ctx: Context,
    {
      chatId,
      results,
    }: { chatId: string; results: CandidateClassificationResult[] }
  ): Promise<void> {
    const { supabase } = ctx;

    for (const result of results) {
      const updateValues = {
        explanation: result.explanation,
        label: result.label,
        status: result.status,
      };

      let matchedRows: { id: string }[] | null = null;

      if (result.linkedinUrl) {
        const { data, error } = await supabase
          .from("classify_candidates")
          .update(updateValues)
          .eq("chat_id", chatId)
          .eq("linkedin_url", result.linkedinUrl)
          .select("id");

        if (error) {
          throw error;
        }

        matchedRows = data;
      }

      if (!matchedRows?.length && result.fullName) {
        const candidateId = await this.findBestCandidateIdByFullName(ctx, {
          chatId,
          fullName: result.fullName,
        });

        if (candidateId) {
          const { data, error } = await supabase
            .from("classify_candidates")
            .update(updateValues)
            .eq("id", candidateId)
            .eq("chat_id", chatId)
            .select("id");

          if (error) {
            throw error;
          }

          matchedRows = data;
        }
      }

      if (!matchedRows?.length) {
        throw new Error(
          `No uploaded candidate found for LinkedIn URL "${result.linkedinUrl}" or name "${result.fullName}"`
        );
      }
    }
  }

  private static async findBestCandidateIdByFullName(
    ctx: Context,
    { chatId, fullName }: { chatId: string; fullName: string }
  ): Promise<string | null> {
    const normalizedTargetName = normalizeName(fullName);

    if (!normalizedTargetName) {
      return null;
    }

    const { data, error } = await ctx.supabase
      .from("classify_candidates")
      .select("id,first_name,last_name")
      .eq("chat_id", chatId);

    if (error) {
      throw error;
    }

    let bestMatch: { id: string; score: number } | null = null;
    let secondBestScore = 0;

    for (const row of data ?? []) {
      const candidateName = normalizeName(
        `${row.first_name ?? ""} ${row.last_name ?? ""}`
      );

      if (!candidateName) {
        continue;
      }

      const score = getNameSimilarity(normalizedTargetName, candidateName);

      if (!bestMatch || score > bestMatch.score) {
        secondBestScore = bestMatch?.score ?? 0;
        bestMatch = {
          id: row.id,
          score,
        };
      } else if (score > secondBestScore) {
        secondBestScore = score;
      }
    }

    if (!bestMatch || bestMatch.score < 0.82) {
      return null;
    }

    if (bestMatch.score < 1 && bestMatch.score - secondBestScore < 0.08) {
      return null;
    }

    return bestMatch.id;
  }
}

function normalizeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getNameSimilarity(left: string, right: string): number {
  if (left === right) {
    return 1;
  }

  if (left.includes(right) || right.includes(left)) {
    return 0.92;
  }

  const maxLength = Math.max(left.length, right.length);

  if (!maxLength) {
    return 0;
  }

  return 1 - getLevenshteinDistance(left, right) / maxLength;
}

function getLevenshteinDistance(left: string, right: string): number {
  const previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    let previousDiagonal = previousRow[0];
    previousRow[0] = leftIndex + 1;

    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const deletion = previousRow[rightIndex + 1] + 1;
      const insertion = previousRow[rightIndex] + 1;
      const substitution =
        previousDiagonal + (left[leftIndex] === right[rightIndex] ? 0 : 1);

      previousDiagonal = previousRow[rightIndex + 1];
      previousRow[rightIndex + 1] = Math.min(deletion, insertion, substitution);
    }
  }

  return previousRow[right.length];
}
