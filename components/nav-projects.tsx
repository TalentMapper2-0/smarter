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

export function NavProjects() {
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

        {workspaces?.map((workspace) => (
          <SidebarMenuItem key={workspace.id}>
            <SidebarMenuButton asChild>
              <Link href={`/p/${workspace.id}`}>           
                <span>{workspace.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}

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
