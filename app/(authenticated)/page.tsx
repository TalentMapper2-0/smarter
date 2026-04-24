"use client"

import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useMemo } from "react"

import {
  CANDIDATE_CLASSIFICATION_NODE,
  CandidateClassificationNode,
  type CandidateClassificationNodeData,
} from "@/components/nodes/candidate-classification-node"
import {
  UPLOAD_CSV_NODE,
  UploadCsvNode,
  UploadCsvNodeData,
} from "@/components/nodes/upload-csv-node"

const nodeTypes = {
  [CANDIDATE_CLASSIFICATION_NODE]: CandidateClassificationNode,
  [UPLOAD_CSV_NODE]: UploadCsvNode,
}

const START_X = 80
const Y = 120
const GAP = 475

const edges: Edge[] = [
  {
    id: "upload-to-classification",
    source: "upload",
    target: "classification",
    type: "smoothstep",
    animated: false,
    style: {
      stroke: "var(--primary)",
      strokeWidth: 1.5,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "var(--primary)",
    },
  },
]

export default function Page() {
  const nodes = useMemo<
    Node<CandidateClassificationNodeData | UploadCsvNodeData>[]
  >(
    () => [
      {
        id: "upload",
        type: UPLOAD_CSV_NODE,
        position: { x: START_X + GAP * 0, y: Y },
        data: {
          status: "initial",
        },
        draggable: false,
      },
      {
        id: "classification",
        type: CANDIDATE_CLASSIFICATION_NODE,
        position: { x: START_X + GAP * 1, y: Y },
        data: {
          status: "initial",
        },
        draggable: false,
      },
    ],
    []
  )

  return (
    <div className="h-screen w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        proOptions={{ hideAttribution: true }}
        fitView
        nodesDraggable={false}
        fitViewOptions={{
          padding: 0.3,
          maxZoom: 1,
        }}
        zoomOnDoubleClick={false}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
