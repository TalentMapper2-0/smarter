import { notFound } from "next/navigation";

import ChatsService from "@/core/services/chats-service";
import { createServerContext } from "@/trpc/server/caller";
import Chat from "@/components/chat/chat";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const ctx = await createServerContext();
  const chat = await ChatsService.findById(ctx, { id });

  if (!chat) {
    notFound();
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl">
      <Chat chat={chat} />
    </div>
  );
}
