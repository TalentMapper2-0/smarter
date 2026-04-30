"use client";

import { usePathname } from "next/navigation";
import { z } from "zod";

import { trpc } from "@/trpc/client/client";

const workspacePathSchema = z.uuid();

function getWorkspaceId(pathname: string) {
  const [, section, id] = pathname.split("/");

  if (section !== "p" || !workspacePathSchema.safeParse(id).success) {
    return null;
  }

  return id;
}

function cleanRouteSegment(segment: string) {
  return decodeURIComponent(segment)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getRouteTitle(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return "Home";
  }

  return segments.map(cleanRouteSegment).join(" / ");
}

export function WorkspaceTitle() {
  const pathname = usePathname();
  const workspaceId = getWorkspaceId(pathname);
  const routeTitle = workspaceId ? "Workspace" : getRouteTitle(pathname);
  const { data: workspace } = trpc.workspaces.byId.useQuery(
    { id: workspaceId ?? "" },
    { enabled: Boolean(workspaceId) }
  );

  return (
    <h1 className="truncate text-sm font-medium">
      {workspace?.title ?? routeTitle}
    </h1>
  );
}
