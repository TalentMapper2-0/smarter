import ChatWelcomeManager from "@/components/chat/chat-welcome-manager";

type PageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto h-full w-full max-w-3xl flex items-center">
      <ChatWelcomeManager error={error} />
    </div>
  );
}
