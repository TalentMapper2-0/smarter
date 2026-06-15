import ChatsService from "@/core/services/chats-service";
import { ProcessTurnInputSchema } from "@/schemas/input";
import { TRPCError } from "@trpc/server";
import "server-only";
import z from "zod";
import { protectedProcedure, router } from "../init";

export const chatsRouter = router({
  processTurn: protectedProcedure
    .input(
      z.object(ProcessTurnInputSchema.shape)
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await ChatsService.processTurn(ctx, { input });
      } catch (error) {
        console.error("chat.processTurn failed", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to process turn",
          cause: error,
        });
      }
    }),
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
  listRecent: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await ChatsService.listRecent(ctx);
    } catch (error) {
      console.error("chats.listRecent failed", error);

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to list chats",
        cause: error,
      });
    }
  }),
});
