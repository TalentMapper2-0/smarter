import ChatsRepository from "@/core/repositories/chats-repository";
import { ChatMessage, ChatMessageRole, ChatStatus } from "@/types/chat";
import { TurnHandlerArgs } from "@/types/handler";

export async function handleInitializedTurn({ ctx, chat }: TurnHandlerArgs): Promise<ChatMessage> {
  const message = await ChatsRepository.addMessage(ctx, {
    chatId: chat.id,
    role: ChatMessageRole.Assistant,
    content:
      "Hallo! Ik ben Smarter, jouw AI-assistent. Ik zal je helpen door het sourcing proces te leiden. Upload als eerste de documenten die je wilt analyseren, zoals vacatureteksten, functieprofielen of andere relevante informatie.",
  });

  await ChatsRepository.updateStatus(ctx, {
    id: chat.id,
    status: ChatStatus.WaitingForAnalysisInput,
  });
  
  return message;
}
