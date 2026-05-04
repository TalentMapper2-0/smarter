import "server-only";
import { Context } from "@/trpc/server/init";

type UploadedCandidateRow = {
  linkedinUrl: string;
  salesNavigatorId: string;
  firstName: string;
  lastName: string;
};

type CreateCandidatesInput = {
  workspaceId: string;
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

export type CandidateClassificationRow = {
  id: string;
  linkedinUrl: string;
  salesNavigatorId: string;
  name: string;
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
  static async findUploadByWorkspaceId(
    ctx: Context,
    { workspaceId }: { workspaceId: string }
  ): Promise<UploadedCandidateData | null> {
    const { supabase } = ctx;

    const { data: vacancyRows, error: vacancyError } = await supabase
      .from("classify_vacancies")
      .select("vacancy_text")
      .eq("workspace_id", workspaceId)
      .limit(1);

    if (vacancyError) {
      throw vacancyError;
    }

    const { data: commentRows, error: commentError } = await supabase
      .from("classify_comments")
      .select("comment_text")
      .eq("workspace_id", workspaceId)
      .limit(1);

    if (commentError) {
      throw commentError;
    }

    const { data: candidateRows, error: candidateError } = await supabase
      .from("classify_candidates")
      .select("linkedin_url,sales_navigator_id,name")
      .eq("workspace_id", workspaceId);

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
        const [firstName = "", ...lastNameParts] = (row.name ?? "").split(" ");

        return {
          linkedinUrl: row.linkedin_url ?? "",
          salesNavigatorId: row.sales_navigator_id ?? "",
          firstName,
          lastName: lastNameParts.join(" "),
        };
      }),
    };
  }

  static async create(
    ctx: Context,
    { workspaceId, rows, vacancyText, commentText }: CreateCandidatesInput
  ): Promise<void> {
    const { supabase } = ctx;
    const candidateRows = rows.map((row) => ({
      linkedin_url: row.linkedinUrl,
      sales_navigator_id: row.salesNavigatorId,
      name: [row.firstName, row.lastName].filter(Boolean).join(" ").trim(),
      workspace_id: workspaceId,
    }));

    const { error: deleteCommentsError } = await supabase
      .from("classify_comments")
      .delete()
      .eq("workspace_id", workspaceId);

    if (deleteCommentsError) {
      throw deleteCommentsError;
    }

    const { error: deleteVacanciesError } = await supabase
      .from("classify_vacancies")
      .delete()
      .eq("workspace_id", workspaceId);

    if (deleteVacanciesError) {
      throw deleteVacanciesError;
    }

    const { error: deleteCandidatesError } = await supabase
      .from("classify_candidates")
      .delete()
      .eq("workspace_id", workspaceId);

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
        workspace_id: workspaceId,
      });

    if (vacancyError) {
      throw vacancyError;
    }

    if (commentText) {
      const { error: commentError } = await supabase
        .from("classify_comments")
        .insert({
          comment_text: commentText,
          workspace_id: workspaceId,
        });

      if (commentError) {
        throw commentError;
      }
    }
  }

  static async listClassificationRowsByWorkspaceId(
    ctx: Context,
    { workspaceId }: { workspaceId: string }
  ): Promise<CandidateClassificationRow[]> {
    const { supabase } = ctx;

    const { data, error } = await supabase
      .from("classify_candidates")
      .select(
        "id,linkedin_url,sales_navigator_id,name,label,explanation,status"
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      linkedinUrl: row.linkedin_url ?? "",
      salesNavigatorId: row.sales_navigator_id ?? "",
      name: row.name ?? "",
      label: row.label ?? "",
      explanation: row.explanation ?? "",
      status: row.status ?? "",
    }));
  }

  static async saveClassificationResults(
    ctx: Context,
    {
      workspaceId,
      results,
    }: { workspaceId: string; results: CandidateClassificationResult[] }
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
        .eq("workspace_id", workspaceId)
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
