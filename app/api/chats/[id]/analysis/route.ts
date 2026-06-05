import "server-only";

import ChatsService from "@/core/services/chats-service";
import { createServerContext } from "@/trpc/server/caller";
import z from "zod";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const chatIdSchema = z.uuid();

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const parsedChatId = chatIdSchema.safeParse(id);

  if (!parsedChatId.success) {
    return Response.json({ message: "Invalid chat id" }, { status: 400 });
  }

  const ctx = await createServerContext();

  if (!ctx.user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const text = getStringFormValue(formData.get("message"));
  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!files.length && !text.trim()) {
    return Response.json(
      { message: "Upload documents or add context first." },
      { status: 400 }
    );
  }

  try {
    const result = await ChatsService.submitAnalysisDocuments(ctx, {
      chatId: parsedChatId.data,
      files,
      text,
    });

    return Response.json(result);
  } catch (error) {
    console.error("chat.analysis failed", error);

    return Response.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to analyze documents",
      },
      { status: 500 }
    );
  }
}

function getStringFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}
