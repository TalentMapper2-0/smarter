import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { WorkspaceTitle } from "@/components/workspace-title";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

function getUserDisplayName(
  email: string,
  metadata: Record<string, unknown> | undefined
) {
  const name =
    metadata?.name ??
    metadata?.full_name ??
    metadata?.preferred_username ??
    metadata?.user_name;

  if (typeof name === "string" && name.trim()) {
    return name;
  }

  return email.split("@")[0] || "Gebruiker";
}

function getUserAvatar(metadata: Record<string, unknown> | undefined) {
  const avatar = metadata?.avatar_url ?? metadata?.picture;

  return typeof avatar === "string" ? avatar : "";
}

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? "";
  const userMetadata = user?.user_metadata as
    | Record<string, unknown>
    | undefined;
  const sidebarUser = {
    name: getUserDisplayName(email, userMetadata),
    email,
    avatar: getUserAvatar(userMetadata),
  };

  return (
    <SidebarProvider>
      <AppSidebar user={sidebarUser} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <WorkspaceTitle />
          </div>
        </header>
        <Separator />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
