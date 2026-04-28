import "server-only";
import { Context } from "@/trpc/server/init";

export type Workspace = {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
};

export default class WorkspacesRepository {
  static async create(
    ctx: Context,
    { title, userId }: { title: string; userId: string }
  ): Promise<Workspace> {
    const { supabase } = ctx;

    const { data, error } = await supabase
      .from("workspaces")
      .insert({ title, user_id: userId })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Workspace;
  }

  static async listByUser(
    ctx: Context,
    userId: string
  ): Promise<Workspace[]> {
    const { supabase } = ctx;

    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    return (data ?? []) as Workspace[];
  }
}
