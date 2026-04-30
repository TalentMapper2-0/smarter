"use client";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { trpc } from "@/trpc/client/client";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavProjects() {
  const pathname = usePathname();
  const { data: workspaces, isLoading } = trpc.workspaces.listRecent.useQuery();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Recente projecten</SidebarGroupLabel>
      <SidebarMenu>
        {isLoading && (
          <SidebarMenuItem>
            <SidebarMenuButton disabled>
              <LoaderCircle className="animate-spin" />
              <span>Laden...</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}

        {workspaces?.map((workspace) => {
          const href = `/p/${workspace.id}`;

          return (
            <SidebarMenuItem key={workspace.id}>
              <SidebarMenuButton
                asChild
                isActive={pathname === href || pathname.startsWith(`${href}/`)}
              >
                <Link href={href}>
                  <span>{workspace.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}

        {!isLoading && workspaces?.length === 0 && (
          <SidebarMenuItem>
            <SidebarMenuButton disabled>
              <span className="text-xs text-muted-foreground">
                Geen projecten
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
