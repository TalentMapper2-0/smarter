import { TRPCError } from "@trpc/server";
import "server-only";
import z from "zod";

import WorkspacesService from "@/core/services/workspaces-service";
import { NodeStatus } from "@/types/note";
import { protectedProcedure, router } from "../init";

const flowStateSchema = z.object({
  uploadCsvStatus: z.enum(NodeStatus),
  candidateClassificationStatus: z.enum(NodeStatus),
  isEdgeButtonDisabled: z.boolean(),
});

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
          error instanceof Error ? error.message : "Failed to list workspaces",
        cause: error,
      });
    }
  }),

  byId: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const workspace = await WorkspacesService.findById(ctx, input);

        if (!workspace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workspace not found",
          });
        }

        return { id: workspace.id, title: workspace.title };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("workspaces.byId failed", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to load workspace",
          cause: error,
        });
      }
    }),

  updateFlowState: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        flowState: flowStateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const workspace = await WorkspacesService.updateFlowState(ctx, input);
        return workspace.flowState;
      } catch (error) {
        console.error("workspaces.updateFlowState failed", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update workspace flow state",
          cause: error,
        });
      }
    }),
});
