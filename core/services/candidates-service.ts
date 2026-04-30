import { Context } from "@/trpc/server/init";
import CandidatesRepository from "../repositories/candidates-repository";
import WorkspacesRepository from "../repositories/workspaces-repository";
import { WorkspaceFlowStage } from "@/types/workspace";

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

export default class CandidatesService {
  static async create(
    ctx: Context,
    input: CreateCandidatesInput
  ): Promise<void> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    const workspace = await WorkspacesRepository.findByIdForUser(ctx, {
      id: input.workspaceId,
      userId: ctx.user.id,
    });

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    await CandidatesRepository.create(ctx, input);
    await WorkspacesRepository.updateFlowStateForUser(ctx, {
      id: input.workspaceId,
      userId: ctx.user.id,
      flowState: {
        flowStage: WorkspaceFlowStage.ReadyToClassify,
      },
    });
  }
}
