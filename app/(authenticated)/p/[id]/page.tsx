import { notFound } from "next/navigation";

import CandidatesService from "@/core/services/candidates-service";
import WorkspacesService from "@/core/services/workspaces-service";
import { createServerContext } from "@/trpc/server/caller";
import { WorkspaceFlow } from "@/components/workspace-flow";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  const ctx = await createServerContext();
  const [workspace, initialUploadData] = await Promise.all([
    WorkspacesService.findById(ctx, { id }),
    CandidatesService.findUpload(ctx, { workspaceId: id }).catch(() => null),
  ]);

  if (!workspace) {
    notFound();
  }

  return (
    <WorkspaceFlow
      workspaceId={id}
      initialFlowState={workspace.flowState}
      initialUploadData={initialUploadData}
    />
  );
}
