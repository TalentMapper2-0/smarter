"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import { Play, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkspaceFlowStore } from "@/stores/workspace-flow-store";
import { WorkspaceFlowStage } from "@/types/workspace";

export const EDGE_WITH_BUTTON = "edge-with-button";

export type EdgeWithButtonData = {
  disable: boolean;
  workspaceId: string;
  onClassify: () => void;
};

export type EdgeWithButtonFlowEdge = Edge<
  EdgeWithButtonData,
  typeof EDGE_WITH_BUTTON
>;

export function EdgeWithButton({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps<EdgeWithButtonFlowEdge>) {
  const isDisabled = data?.disable ?? false;
  const onClassify = data?.onClassify;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />

      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          <Button
            type="button"
            size="icon"
            variant={isDisabled ? "outline" : "default"}
            disabled={isDisabled}
            className={cn("h-7 w-7 rounded-full disabled:opacity-100")}
            onClick={(event) => {
              event.stopPropagation();
              if (isDisabled || !onClassify) {
                return;
              }
              onClassify();
            }}
          >
            {isDisabled ? (
              <X className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
