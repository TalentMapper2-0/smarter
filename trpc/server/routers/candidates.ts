import { TRPCError } from "@trpc/server";
import "server-only";
import z from "zod";

import CandidatesService from "@/core/services/candidates-service";
import { protectedProcedure, router } from "../init";

export const candidatesRouter = router({
  create: protectedProcedure
    .input(
      z.array(
        z.object({
          linkedinUrl: z.string(),
          salesNavigatorId: z.string(),
          firstName: z.string(),
          lastName: z.string(),
        })
      )
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await CandidatesService.create(ctx, input);
      } catch (error) {
        console.error("candidates.create failed", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create candidates",
          cause: error,
        });
      }
    }),
});
