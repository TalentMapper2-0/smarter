import { Context } from "@/trpc/server/init";
import WorkspacesRepository from "../repositories/workspaces-repository";
import { Workspace, WorkspaceFlowStateSnapshot } from "@/types/workspace";
import { z } from "zod";

const workspaceIdSchema = z.uuid();

export default class WorkspacesService {
  static async create(
    ctx: Context,
    { title }: { title: string }
  ): Promise<Workspace> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    return WorkspacesRepository.create(ctx, {
      title,
      userId: ctx.user.id,
    });
  }

  static async listRecent(ctx: Context): Promise<Workspace[]> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    return WorkspacesRepository.listByUser(ctx, ctx.user.id);
  }

  static async findById(
    ctx: Context,
    { id }: { id: string }
  ): Promise<Workspace | null> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    if (!workspaceIdSchema.safeParse(id).success) {
      return null;
    }

    return WorkspacesRepository.findByIdForUser(ctx, {
      id,
      userId: ctx.user.id,
    });
  }

  static async updateFlowState(
    ctx: Context,
    { id, flowState }: { id: string; flowState: WorkspaceFlowStateSnapshot }
  ): Promise<Workspace> {
    if (!ctx.user) {
      throw new Error("Not authenticated");
    }

    if (!workspaceIdSchema.safeParse(id).success) {
      throw new Error("Workspace not found");
    }

    const workspace = await WorkspacesRepository.updateFlowStateForUser(ctx, {
      id,
      userId: ctx.user.id,
      flowState,
    });

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    return workspace;
  }
}
