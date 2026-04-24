import { initTRPC, TRPCError } from "@trpc/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { transformer } from "../client/transformer";

export type Context = {
  supabase: SupabaseClient;
  user: { id: string; email: string } | null;
  isAdmin: boolean;
};

const t = initTRPC.context<Context>().create({
  transformer,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }
  return next();
});

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not authorized",
    });
  }
  return next();
});
