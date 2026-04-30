import "server-only";
import { Context } from "@/trpc/server/init";
import {
  defaultWorkspaceFlowState,
  Workspace,
  WorkspaceFlowStateSnapshot,
} from "@/types/workspace";

const workspaceSelect =
  "id, title, userId:user_id, createdAt:created_at, flowStage:flow_stage";

type WorkspaceRow = Omit<Workspace, "flowState"> & WorkspaceFlowStateSnapshot;

function mapWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    title: row.title,
    userId: row.userId,
    createdAt: row.createdAt,
    flowState: {
      flowStage: row.flowStage ?? defaultWorkspaceFlowState.flowStage,
    },
  };
}

export default class WorkspacesRepository {
  static async create(
    ctx: Context,
    { title, userId }: { title: string; userId: string }
  ): Promise<Workspace> {
    const { supabase } = ctx;

    const { data, error } = await supabase
      .from("workspaces")
      .insert({ title, user_id: userId })
      .select(workspaceSelect)
      .single();

    if (error) {
      throw error;
    }

    return mapWorkspace(data);
  }

  static async listByUser(ctx: Context, userId: string): Promise<Workspace[]> {
    const { supabase } = ctx;

    const { data, error } = await supabase
      .from("workspaces")
      .select(workspaceSelect)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    return data.map(mapWorkspace);
  }

  static async findByIdForUser(
    ctx: Context,
    { id, userId }: { id: string; userId: string }
  ): Promise<Workspace | null> {
    const { supabase } = ctx;

    const { data, error } = await supabase
      .from("workspaces")
      .select(workspaceSelect)
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapWorkspace(data) : null;
  }

  static async updateFlowStateForUser(
    ctx: Context,
    {
      id,
      userId,
      flowState,
    }: {
      id: string;
      userId: string;
      flowState: WorkspaceFlowStateSnapshot;
    }
  ): Promise<Workspace | null> {
    const { supabase } = ctx;

    const { data, error } = await supabase
      .from("workspaces")
      .update({
        flow_stage: flowState.flowStage,
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select(workspaceSelect)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapWorkspace(data) : null;
  }
}
