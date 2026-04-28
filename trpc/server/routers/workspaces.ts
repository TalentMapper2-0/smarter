import { TRPCError } from "@trpc/server";
import "server-only";
import z from "zod";

import WorkspacesService from "@/core/services/workspaces-service";
import { protectedProcedure, router } from "../init";

export const workspacesRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const workspace = await WorkspacesService.create(ctx, {
          title: input.title,
        });
        return { id: workspace.id, title: workspace.title };
      } catch (error) {
        console.error("workspaces.create failed", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create workspace",
          cause: error,
        });
      }
    }),

  listRecent: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await WorkspacesService.listRecent(ctx);
    } catch (error) {
      console.error("workspaces.listRecent failed", error);

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to list workspaces",
        cause: error,
      });
    }
  }),
});
