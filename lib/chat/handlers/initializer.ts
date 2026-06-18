import ChatsRepository from "@/core/repositories/chats-repository";
import { ChatMessageRole, ChatStatus } from "@/types/chat";
import { TurnHandlerArgs } from "@/types/handler";
import { createChatStream } from "../create-chat-stream";

export async function handleInitializedTurn({
  ctx,
  chat,
}: TurnHandlerArgs): Promise<Response> {
  return createChatStream(async ({ send }) => {
    const content =
      "Hallo! Ik ben Smarter, jouw AI-assistent. Ik zal je helpen door het sourcing proces te leiden. Upload als eerste de documenten die je wilt analyseren, zoals vacatureteksten, functieprofielen of andere relevante informatie.";

    const message = await ChatsRepository.addMessage(ctx, {
      chatId: chat.id,
      role: ChatMessageRole.Assistant,
      content,
    });

    if (!message.content) {
      throw new Error("Failed to add assistant message");
    }

    await ChatsRepository.updateStatus(ctx, {
      id: chat.id,
      status: ChatStatus.WaitingForAnalysisInput,
    });

    send({
      type: "assistant_message",
      message: {
        id: message.id,
        role: "assistant",
        content: message.content,
      },
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

    send({
      type: "workflow_state",
      status: ChatStatus.WaitingForAnalysisInput,
    });
  });
}