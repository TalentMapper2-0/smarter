"use client";

import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/nodes/base-node";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { NodeStatusIndicator } from "../node-status-indicator";
import { NodeStatus } from "@/types/note";

export const CANDIDATE_CLASSIFICATION_NODE = "candidateClassification";

const edgeAnchorStyle = {
  width: 1,
  height: 1,
  minWidth: 1,
  minHeight: 1,
  border: 0,
  background: "transparent",
  opacity: 0,
  transform: "translateY(-50%)",
};

export type CandidateClassificationNodeData = {
  status?: NodeStatus;
  actionRequiredMessage?: string;
};

export type CandidateClassificationFlowNode = Node<
  CandidateClassificationNodeData,
  typeof CANDIDATE_CLASSIFICATION_NODE
>;

const dummyClassificationResult = {
  total: 12,
  groups: [
    {
      label: "Sterke fit",
      count: 4,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    {
      label: "Twijfel",
      count: 5,
      className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    {
      label: "Geen fit",
      count: 3,
      className: "border-red-200 bg-red-50 text-red-700",
    },
  ],
  topCandidates: [
    { name: "Sofia de Vries", label: "Sterke fit", score: 92 },
    { name: "Milan Jansen", label: "Sterke fit", score: 88 },
    { name: "Noor Bakker", label: "Twijfel", score: 71 },
  ],
};

export const CandidateClassificationNode = memo(
  ({ data }: NodeProps<CandidateClassificationFlowNode>) => {
    const hasResult = data?.status === NodeStatus.Success;

    return (
      <div className="relative h-full">
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={false}
          style={edgeAnchorStyle}
        />

        <NodeStatusIndicator
          status={data?.status}
          variant="border"
          actionRequiredMessage={data?.actionRequiredMessage}
        >
          <BaseNode className={cn("h-full", hasResult ? "min-w-80" : "min-w-64")}>
            <BaseNodeHeader>
              <BaseNodeHeaderTitle>Kandidaat classificeren</BaseNodeHeaderTitle>
              {hasResult ? (
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-700"
                >
                  Klaar
                </Badge>
              ) : null}
            </BaseNodeHeader>
            <BaseNodeContent className="pt-0 text-sm">
              {hasResult ? (
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    {dummyClassificationResult.total} kandidaten geclassificeerd
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {dummyClassificationResult.groups.map((group) => (
                      <div
                        key={group.label}
                        className={cn(
                          "rounded-md border px-2 py-1.5",
                          group.className
                        )}
                      >
                        <p className="text-lg leading-none font-semibold">
                          {group.count}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {group.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    {dummyClassificationResult.topCandidates.map(
                      (candidate) => (
                        <div
                          key={candidate.name}
                          className="flex items-center justify-between gap-3 border-t pt-1.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {candidate.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {candidate.label}
                            </p>
                          </div>
                          <span className="text-sm font-semibold">
                            {candidate.score}%
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Gebruik deze node om binnenkomende sollicitaties te groeperen
                  op fit.
                </p>
              )}
            </BaseNodeContent>
          </BaseNode>
        </NodeStatusIndicator>

        <Handle
          type="source"
          position={Position.Right}
          isConnectable={false}
          style={edgeAnchorStyle}
        />
      </div>
    );
  }
);

CandidateClassificationNode.displayName = "CandidateClassificationNode";
