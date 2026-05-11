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
      const { data, error } = await supabase
        .from("classify_candidates")
        .update({
          explanation: result.explanation,
          label: result.label,
          status: result.status,
        })
        .eq("chat_id", chatId)
        .eq("linkedin_url", result.linkedinUrl)
        .select("id");

      if (error) {
        throw error;
      }

      if (!data?.length) {
        throw new Error(
          `No uploaded candidate found for LinkedIn URL: ${result.linkedinUrl}`
        );
      }
    }
  }
}
