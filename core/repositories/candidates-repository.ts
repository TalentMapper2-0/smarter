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
  rows: UploadedCandidateRow[];
};

export default class CandidatesRepository {
  static async create(
    ctx: Context,
    { workspaceId, rows }: CreateCandidatesInput
  ): Promise<void> {
    const { supabase } = ctx;
    const candidateRows = rows.map((row) => ({
      linkedin_url: row.linkedinUrl,
      sales_navigator_id: row.salesNavigatorId,
      name: [row.firstName, row.lastName].filter(Boolean).join(" ").trim(),
      workspace_id: workspaceId,
    }));

    const { error } = await supabase
      .from("classify_candidates")
      .insert(candidateRows);

    if (error) {
      throw error;
    }
  }
}
