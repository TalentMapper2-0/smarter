"use client"

import { Background, ReactFlow, type Edge, type Node } from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import {
  CandidateClassificationNode,
  CANDIDATE_CLASSIFICATION_NODE,
  type CandidateClassificationNodeData,
} from "@/components/nodes/candidate-classification-node"

const nodeTypes = {
  [CANDIDATE_CLASSIFICATION_NODE]: CandidateClassificationNode,
}

const nodes: Node<CandidateClassificationNodeData>[] = [
  {
    id: "candidate-classification-1",
    type: CANDIDATE_CLASSIFICATION_NODE,
    position: { x: 100, y: 100 },
    data: {
      status: "initial",
    },
    draggable: false,
  },
]

const edges: Edge[] = []

export default function Page() {
  return (
    <div className="h-screen w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background />
      </ReactFlow>
    </div>
  )
}
