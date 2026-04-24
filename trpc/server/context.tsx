import { cookies } from "next/headers";
import type { Context } from "./init";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export async function createServerContext(): Promise<Context> {
  const cookieStore = cookies();
  const authClient = createClient(await cookieStore);
  const supabase = createAdminClient();

  const {
    data: { user },
  } = await authClient.auth.getUser();

  return {
    supabase,
    user: user
      ? {
          id: user.id,
          email: user.email ?? "",
        }
      : null,
    isAdmin: user?.app_metadata?.role === "admin",
  };
}

export const createTRPCContext = createServerContext;
