import "server-only";
import { protectedProcedure, router } from "../init";
import z from "zod";
import { TRPCError } from "@trpc/server";
import ChatsService from "@/core/services/chats-service";
import { ChatStatus } from "@/types/chat";

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
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        status: z.nativeEnum(ChatStatus),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await ChatsService.updateStatus(ctx, input);
      } catch (error) {
        console.error("chat.updateStatus failed", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update chat status",
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
  reuploadCsv: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        fileName: z.string(),
        fileSize: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await ChatsService.reuploadCsv(ctx, input);
      } catch (error) {
        console.error("chat.reuploadCsv failed", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to reupload csv",
          cause: error,
        });
      }
    }),
  uploadCsvMetadata: protectedProcedure
    .input(
      z.object({
        chatId: z.uuid(),
        fileName: z.string(),
        fileSize: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await ChatsService.uploadCsvMetadata(ctx, input);
      } catch (error) {
        console.error("chat.uploadCsvMetadata failed", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to upload csv metadata",
          cause: error,
        });
      }
    }),
  saveMappedCsv: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        fileName: z.string(),
        fileSize: z.number(),
        mappedRows: z.array(z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await ChatsService.saveMappedCsv(ctx, input);
      } catch (error) {
        console.error("chat.saveMappedCsv failed", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to save mapped csv",
          cause: error,
        });
      }
    }),
  saveVacancy: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        vacancyText: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await ChatsService.saveVacancy(ctx, input);
      } catch (error) {
        console.error("chat.saveVacancy failed", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to save vacancy",
          cause: error,
        });
      }
    }),
  saveComment: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        commentText: z.string().trim().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await ChatsService.saveComment(ctx, input);
      } catch (error) {
        console.error("chat.saveComment failed", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to save comment",
          cause: error,
        });
      }
    }),
  confirmComment: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        wantsComment: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await ChatsService.confirmComment(ctx, input);
      } catch (error) {
        console.error("chat.confirmComment failed", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to confirm comment",
          cause: error,
        });
      }
    }),
});
