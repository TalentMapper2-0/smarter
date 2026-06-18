export type ChatStreamEvent =
  | {
      type: "assistant_message";
      message: {
        id: string;
        role: "assistant";
        content: string;
      };
    }
  | {
      type: "ui_action";
      action: {
        type: "file_upload";
        key: string;
        label: string;
        multiple?: boolean;
        accept?: string[];
      };
    }
  | {
      type: "workflow_state";
      status: string;
    }
  | {
      type: "error";
      message: string;
    };

export function createChatStream(
  run: (helpers: {
    send: (event: ChatStreamEvent) => void;
  }) => Promise<void>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ChatStreamEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      try {
        await run({ send });
      } catch (error) {
        send({
          type: "error",
          message: "Something went wrong",
        });
      } finally {
        controller.close();
      }
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