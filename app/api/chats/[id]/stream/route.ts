import "server-only";

import ChatManagerService from "@/core/services/chat-manager-service";
import { messages as chatMessages, type MessageKey } from "@/lib/chat/messages";
import { createServerContext } from "@/trpc/server/caller";
import z from "zod";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const chatIdSchema = z.uuid();
const messageKeys = Object.keys(chatMessages) as [MessageKey, ...MessageKey[]];
const requestSchema = z.object({
  messageKey: z.enum(messageKeys).optional(),
});

const streamHeaders = {
  "Cache-Control": "no-cache, no-transform",
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "X-Accel-Buffering": "no",
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const parsedChatId = chatIdSchema.safeParse(id);

  if (!parsedChatId.success) {
    return new Response("Invalid chat id", { status: 400 });
  }

  const ctx = await createServerContext();

  if (!ctx.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rawBody = await request.text();
  let requestBody: unknown = {};

  if (rawBody) {
    try {
      requestBody = JSON.parse(rawBody);
    } catch {
      return new Response("Invalid stream request", { status: 400 });
    }
  }

  const parsedBody = requestSchema.safeParse(requestBody);

  if (!parsedBody.success) {
    return new Response("Invalid stream request", { status: 400 });
  }

  const plan = await ChatManagerService.getNextStreamPlan(ctx, {
    chatId: parsedChatId.data,
    ...parsedBody.data,
  });

  if (plan.type === "not-found") {
    return new Response("Not found", { status: 404 });
  }

  if (plan.type === "empty") {
    return new Response(null, { status: 204 });
  }

  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      void (async () => {
        try {
          for (const chunk of chunkText(plan.message.content)) {
            if (cancelled) {
              return;
            }

            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "chunk",
                  content: chunk,
                }) + "\n"
              )
            );

            await wait(35);
          }

          if (!cancelled) {
            await ChatManagerService.persistStreamedStep(ctx, {
              chatId: parsedChatId.data,
              content: plan.message.content,
              role: plan.message.role,
              nextStatus: plan.nextStatus,
            });

            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "done",
                  nextStatus: plan.nextStatus,
                }) + "\n"
              )
            );
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      })();
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: streamHeaders,
  });
}

function chunkText(text: string) {
  return text.match(/\S+\s*/g) ?? [];
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
