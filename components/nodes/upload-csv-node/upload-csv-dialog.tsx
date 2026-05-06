"use client";

import { useRouter } from "next/navigation";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useWorkspaceFlowStore } from "@/stores/workspace-flow-store";
import { trpc } from "@/trpc/client/client";

import { TEXT } from "./constants";
import { UploadCsvForm } from "./upload-csv-form";
import type { UploadedCandidateData } from "@/core/repositories/candidates-repository";

export function UploadCsvDialog({
  isLocked,
  open,
  onOpenChangeAction,
  workspaceId,
  initialUploadData,
  onClassify,
}: {
  isLocked: boolean;
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  workspaceId: string;
  initialUploadData: UploadedCandidateData | null;
  onClassify?: () => void;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const completeCsvUpload = useWorkspaceFlowStore(
    (state) => state.completeCsvUpload
  );

  async function handleSave() {
    completeCsvUpload();
    await Promise.all([
      utils.candidates.getUpload.invalidate({ workspaceId }),
      utils.workspaces.listRecent.invalidate(),
    ]);
    router.refresh();
    onOpenChangeAction(false);
  }

  async function handleSaveAndClassify() {
    completeCsvUpload();
    await Promise.all([
      utils.candidates.getUpload.invalidate({ workspaceId }),
      utils.workspaces.listRecent.invalidate(),
    ]);
    router.refresh();
    onOpenChangeAction(false);
    onClassify?.();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChangeAction}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-150">
        <SheetHeader>
          <SheetTitle>{TEXT.title}</SheetTitle>
          <SheetDescription>{TEXT.description}</SheetDescription>
        </SheetHeader>
        <UploadCsvForm
          className="px-4"
          isLocked={isLocked}
          onSaveAction={handleSave}
          onSaveAndClassifyAction={onClassify ? handleSaveAndClassify : undefined}
          workspaceId={workspaceId}
          initialUploadData={initialUploadData}
        />
      </SheetContent>
    </Sheet>
  );
}
