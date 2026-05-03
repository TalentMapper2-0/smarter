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
  vacancyText: string;
  commentText?: string;
  rows: UploadedCandidateRow[];
};

export default class CandidatesService {
  static async findUpload(
    ctx: Context,
    { workspaceId }: { workspaceId: string }
  ) {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    const workspace = await WorkspacesRepository.findByIdForUser(ctx, {
      id: workspaceId,
      userId: ctx.user.id,
    });

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    return CandidatesRepository.findUploadByWorkspaceId(ctx, { workspaceId });
  }

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

    if (
      workspace.flowState.flowStage !== WorkspaceFlowStage.NeedsCsv &&
      workspace.flowState.flowStage !== WorkspaceFlowStage.ReadyToClassify
    ) {
      throw new Error(
        "This upload can no longer be changed because the next step has already processed the data."
      );
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
