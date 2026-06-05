"use client";

import {
  AlertTriangleIcon,
  CheckIcon,
  CircleIcon,
  Loader2Icon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  getChatStageProgress,
  getChatStageStatusState,
  type ChatStageStatusState,
  type ChatStatusDefinition,
} from "@/lib/chat/stages";
import { ChatStatus } from "@/types/chat";

type ChatStageProgressProps = {
  status: ChatStatus;
};

const statusIcons = {
  complete: CheckIcon,
  current: Loader2Icon,
  upcoming: CircleIcon,
  attention: AlertTriangleIcon,
} satisfies Record<ChatStageStatusState, typeof CheckIcon>;

export function ChatStageProgress({ status }: ChatStageProgressProps) {
  const progress = getChatStageProgress(status);

  return (
    <TooltipProvider>
      <section
        aria-label="Workflow voortgang"
        className="flex shrink-0 flex-col gap-3 border-b bg-background px-4 py-3"
      >
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Badge variant="secondary">
              Fase {progress.activeStageIndex + 1}/{progress.stages.length}
            </Badge>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {progress.activeStage.label}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {progress.activeStatus.label}
              </p>
            </div>
          </div>
          <Badge variant="outline">{progress.overallProgress}%</Badge>
        </div>

        <Progress
          aria-label="Totale workflow voortgang"
          value={progress.overallProgress}
        />

        <div className="flex flex-wrap gap-2">
          {progress.activeStage.statuses.map((stageStatus) => (
            <StageStatusItem
              currentStatus={status}
              key={stageStatus.status}
              status={stageStatus}
            />
          ))}
        </div>
      </section>
    </TooltipProvider>
  );
}

function StageStatusItem({
  currentStatus,
  status,
}: {
  currentStatus: ChatStatus;
  status: ChatStatusDefinition;
}) {
  const state = getChatStageStatusState(status, currentStatus);
  const StatusIcon = statusIcons[state];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex h-9 max-w-full min-w-36 flex-1 basis-36 items-center gap-2 rounded-md border px-2 text-xs transition-colors sm:flex-none",
            state === "complete" &&
              "border-border bg-muted text-muted-foreground",
            state === "current" && "border-primary bg-primary/10 text-primary",
            state === "upcoming" &&
              "border-border bg-background text-muted-foreground",
            state === "attention" &&
              "border-destructive bg-destructive/10 text-destructive"
          )}
        >
          <StatusIcon
            aria-hidden="true"
            className={cn(
              "size-3.5 shrink-0",
              state === "current" && "animate-spin"
            )}
          />
          <span className="min-w-0 truncate font-medium">{status.label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{status.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
