"use client"

import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/nodes/base-node"
import { type Node, type NodeProps } from "@xyflow/react"
import { memo } from "react"
import { NodeStatus, NodeStatusIndicator } from "../node-status-indicator"

export const CANDIDATE_CLASSIFICATION_NODE = "candidateClassification"

export type CandidateClassificationNodeData = {
  status?: NodeStatus
}

export type CandidateClassificationFlowNode = Node<
  CandidateClassificationNodeData,
  typeof CANDIDATE_CLASSIFICATION_NODE
>

export const CandidateClassificationNode = memo(
  ({ data }: NodeProps<CandidateClassificationFlowNode>) => {
    return (
      <NodeStatusIndicator status={data?.status} variant="border">
        <BaseNode className="min-w-64">
          <BaseNodeHeader>
            <BaseNodeHeaderTitle>
              Kandidaat classificeren
            </BaseNodeHeaderTitle>
          </BaseNodeHeader>
          <BaseNodeContent className="pt-0 text-sm text-muted-foreground">
            Gebruik deze node om binnenkomende sollicitaties te groeperen op fit.
          </BaseNodeContent>
        </BaseNode>
      </NodeStatusIndicator>
    )
  }
)

CandidateClassificationNode.displayName = "CandidateClassificationNode"
