"use client";

import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";

import {
  EDGE_WITH_BUTTON,
  EdgeWithButton,
} from "@/components/edges/edge-with-button";
import { SUCCESS_EDGE, SuccessEdge } from "@/components/edges/success-edge";
import {
  CANDIDATE_CLASSIFICATION_NODE,
  CandidateClassificationNode,
  type CandidateClassificationNodeData,
} from "@/components/nodes/candidate-classification-node";
import {
  UPLOAD_CSV_NODE,
  UploadCsvNode,
  type UploadCsvNodeData,
} from "@/components/nodes/upload-csv-node";
import { useWorkspaceFlowStore } from "@/stores/workspace-flow-store";
import { NodeStatus } from "@/types/note";
import { type WorkspaceFlowStateSnapshot } from "@/types/workspace";

const nodeTypes = {
  [CANDIDATE_CLASSIFICATION_NODE]: CandidateClassificationNode,
  [UPLOAD_CSV_NODE]: UploadCsvNode,
};

const edgeTypes = {
  [EDGE_WITH_BUTTON]: EdgeWithButton,
  [SUCCESS_EDGE]: SuccessEdge,
};

const inactiveEdgeColor = "var(--muted-foreground/50)";
const successEdgeColor = "var(--color-emerald-600)";

const START_X = 80;
const Y = 120;
const GAP = 500;

export function WorkspaceFlow({
  workspaceId,
  initialFlowState,
}: {
  workspaceId: string;
  initialFlowState: WorkspaceFlowStateSnapshot;
}) {
  const {
    uploadCsvStatus,
    candidateClassificationStatus,
    isEdgeButtonDisabled,
    setWorkspaceFlow,
  } = useWorkspaceFlowStore(
    useShallow((state) => ({
      uploadCsvStatus: state.uploadCsvStatus,
      candidateClassificationStatus: state.candidateClassificationStatus,
      isEdgeButtonDisabled: state.isEdgeButtonDisabled,
      setWorkspaceFlow: state.setWorkspaceFlow,
    }))
  );

  useEffect(() => {
    setWorkspaceFlow(initialFlowState);
  }, [initialFlowState, setWorkspaceFlow]);

  const nodes = useMemo<
    Node<CandidateClassificationNodeData | UploadCsvNodeData>[]
  >(
    () => [
      {
        id: "upload",
        type: UPLOAD_CSV_NODE,
        position: { x: START_X + GAP * 0, y: Y },
        data: {
          status: uploadCsvStatus,
          workspaceId,
        },
        draggable: false,
      },
      {
        id: "classification",
        type: CANDIDATE_CLASSIFICATION_NODE,
        position: { x: START_X + GAP * 1, y: Y },
        data: {
          status: candidateClassificationStatus,
        },
        draggable: false,
        style: {
          pointerEvents: "none",
        },
      },
    ],
    [candidateClassificationStatus, uploadCsvStatus, workspaceId]
  );

  const edges = useMemo<Edge[]>(() => {
    const hasStartedClassification =
      candidateClassificationStatus !== NodeStatus.Initial;

    if (hasStartedClassification) {
      return [
        {
          id: "upload-to-classification",
          source: "upload",
          target: "classification",
          type: SUCCESS_EDGE,
          selectable: false,
          focusable: false,
          animated: false,
          style: {
            stroke: successEdgeColor,
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: successEdgeColor,
          },
        },
      ];
    }

    return [
      {
        id: "upload-to-classification",
        source: "upload",
        target: "classification",
        type: EDGE_WITH_BUTTON,
        selectable: false,
        focusable: false,
        animated: false,
        style: {
          stroke: inactiveEdgeColor,
          strokeWidth: 1.5,
          strokeDasharray: "8 4",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: inactiveEdgeColor,
        },
        data: {
          disable: isEdgeButtonDisabled,
          workspaceId,
        },
      },
    ];
  }, [candidateClassificationStatus, isEdgeButtonDisabled, workspaceId]);

  return (
    <div className="w-full flex-1">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
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
  );
}
