import "server-only";

import ChatManagerService from "@/core/services/chat-manager-service";
import { createServerContext } from "@/trpc/server/caller";
import z from "zod";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const chatIdSchema = z.uuid();

const streamHeaders = {
  "Cache-Control": "no-cache, no-transform",
  "Content-Type": "text/plain; charset=utf-8",
  "X-Accel-Buffering": "no",
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const parsedChatId = chatIdSchema.safeParse(id);

  if (!parsedChatId.success) {
    return new Response("Invalid chat id", { status: 400 });
  }

  const ctx = await createServerContext();

  if (!ctx.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const plan = await ChatManagerService.getNextStreamPlan(ctx, {
    chatId: parsedChatId.data,
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

            controller.enqueue(encoder.encode(chunk));
            await wait(35);
          }

          if (!cancelled) {
            await ChatManagerService.persistStreamedStep(ctx, {
              chatId: parsedChatId.data,
              content: plan.message.content,
              role: plan.message.role,
              nextStatus: plan.nextStatus,
            });
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
