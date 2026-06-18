import ChatsRepository from "@/core/repositories/chats-repository";
import { ChatMessageRole } from "@/types/chat";
import { TurnHandlerArgs } from "@/types/handler";

function streamJsonEvent(event: unknown) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function handleWaitingForAnalysisInputTurn({
  ctx,
  chat,
}: TurnHandlerArgs): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(streamJsonEvent(event)));
      };

      const content =
        "Ik wacht nog op de documenten die je wilt laten analyseren. Upload bijvoorbeeld een vacaturetekst, functieprofiel of ander relevant document.";

      const message = await ChatsRepository.addMessage(ctx, {
        chatId: chat.id,
        role: ChatMessageRole.Assistant,
        content,
      });

      send({
        type: "assistant_message",
        message,
      });

      send({
        type: "ui_action",
        action: {
          type: "file_upload",
          key: "analysis_input",
          label: "Upload documenten",
          multiple: true,
          accept: [".pdf", ".docx", ".txt"],
        },
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}