import { Context } from "@/trpc/server/init";
import CandidatesRepository from "../repositories/candidates-repository";

type UploadedCandidateRow = {
  linkedinUrl: string;
  salesNavigatorId: string;
  firstName: string;
  lastName: string;
};

export default class CandidatesService {
  static async create(
    ctx: Context,
    rows: UploadedCandidateRow[]
  ): Promise<void> {
    return CandidatesRepository.create(ctx, rows);
  }
}
