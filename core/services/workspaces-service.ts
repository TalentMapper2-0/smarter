import { Context } from "@/trpc/server/init";
import WorkspacesRepository, {
  type Workspace,
} from "../repositories/workspaces-repository";

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
}
