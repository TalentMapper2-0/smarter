import "server-only";
import { protectedProcedure, router } from "../init";
import z from "zod";
import { TRPCError } from "@trpc/server";
import ChatsService from "@/core/services/chats-service";

export const chatsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(2).max(20),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await ChatsService.create(ctx, input.title);
      } catch (error) {
        console.error("chat.create failed", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create chat",
          cause: error,
        });
      }
    }),
});
