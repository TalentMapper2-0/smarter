import "server-only";
import { Context } from "@/trpc/server/init";

type UploadedCandidateRow = {
  linkedinUrl: string;
  salesNavigatorId: string;
  firstName: string;
  lastName: string;
};

export default class CandidatesRepository {
  static async create(
    ctx: Context,
    rows: UploadedCandidateRow[]
  ): Promise<void> {
    const { supabase } = ctx;
    const candidateRows = rows.map((row) => ({
      linkedin_url: row.linkedinUrl,
      sales_navigator_id: row.salesNavigatorId,
      name: [row.firstName, row.lastName].filter(Boolean).join(" ").trim(),
    }));

    const { error } = await supabase
      .from("classify_candidates")
      .insert(candidateRows);

    if (error) {
      throw error;
    }
  }
}
