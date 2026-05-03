import { notFound } from "next/navigation";

import WorkspacesService from "@/core/services/workspaces-service";
import { createServerContext } from "@/trpc/server/caller";

import { WorkspaceFlow } from "../../../../components/workspace-flow";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  const ctx = await createServerContext();
  const workspace = await WorkspacesService.findById(ctx, { id });

  if (!workspace) {
    notFound();
  }

  return (
    <WorkspaceFlow workspaceId={id} initialFlowState={workspace.flowState} />
  );
}
