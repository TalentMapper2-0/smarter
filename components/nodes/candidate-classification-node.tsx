"use client";

import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/nodes/base-node";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { NodeStatus, NodeStatusIndicator } from "../node-status-indicator";

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
}

export type CandidateClassificationNodeData = {
  status?: NodeStatus;
};

export type CandidateClassificationFlowNode = Node<
  CandidateClassificationNodeData,
  typeof CANDIDATE_CLASSIFICATION_NODE
>;

export const CandidateClassificationNode = memo(
  ({ data }: NodeProps<CandidateClassificationFlowNode>) => {
    return (
      <div className="relative">
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={false}
          style={edgeAnchorStyle}
        />

        <NodeStatusIndicator status={data?.status} variant="border">
          <BaseNode className="min-w-64">
            <BaseNodeHeader>
              <BaseNodeHeaderTitle>Kandidaat classificeren</BaseNodeHeaderTitle>
            </BaseNodeHeader>
            <BaseNodeContent className="pt-0 text-sm text-muted-foreground">
              Gebruik deze node om binnenkomende sollicitaties te groeperen op
              fit.
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
