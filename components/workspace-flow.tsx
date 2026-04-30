"use client";

import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import {
  EDGE_WITH_BUTTON,
  EdgeWithButton,
} from "@/components/edges/edge-with-button";
import { NORMAL_EDGE, NormalEdge } from "@/components/edges/normal-edge";
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
import {
  getWorkspaceNodeStatuses,
  WorkspaceFlowStage,
  type WorkspaceFlowStateSnapshot,
} from "@/types/workspace";

const nodeTypes = {
  [CANDIDATE_CLASSIFICATION_NODE]: CandidateClassificationNode,
  [UPLOAD_CSV_NODE]: UploadCsvNode,
};

const edgeTypes = {
  [EDGE_WITH_BUTTON]: EdgeWithButton,
  [NORMAL_EDGE]: NormalEdge,
};

type WorkspaceNode = Node<CandidateClassificationNodeData | UploadCsvNodeData>;

const edgeColor = "var(--muted-foreground/50)";

const START_X = 80;
const Y = 120;
const GAP = 500;
const DEFAULT_NODE_SIZE = {
  width: 256,
  height: 112,
};
const INITIAL_FIT_VIEW_MAX_ZOOM = 0.75;

function withDefaultNodeSize<TNode extends WorkspaceNode>(node: TNode): TNode {
  return {
    ...node,
    initialWidth: DEFAULT_NODE_SIZE.width,
    initialHeight: DEFAULT_NODE_SIZE.height,
  };
}

export function WorkspaceFlow({
  workspaceId,
  initialFlowState,
}: {
  workspaceId: string;
  initialFlowState: WorkspaceFlowStateSnapshot;
}) {
  const {
    storeWorkspaceId,
    flowStage,
    setWorkspaceFlow,
  } = useWorkspaceFlowStore(
    useShallow((state) => ({
      storeWorkspaceId: state.workspaceId,
      flowStage: state.flowStage,
      setWorkspaceFlow: state.setWorkspaceFlow,
    }))
  );
  const currentFlowStage =
    storeWorkspaceId === workspaceId ? flowStage : initialFlowState.flowStage;

  useEffect(() => {
    setWorkspaceFlow(initialFlowState, workspaceId);
  }, [initialFlowState, setWorkspaceFlow, workspaceId]);

  const nodes = useMemo<WorkspaceNode[]>(() => {
    const { uploadCsvStatus, candidateClassificationStatus } =
      getWorkspaceNodeStatuses(currentFlowStage);
    const flowNodes: WorkspaceNode[] = [
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
    ];

    return flowNodes.map(withDefaultNodeSize);
  }, [currentFlowStage, workspaceId]);

  const edges = useMemo<Edge[]>(() => {
    const isEdgeButtonDisabled =
      currentFlowStage !== WorkspaceFlowStage.ReadyToClassify;

    return [
      {
        id: "upload-to-classification",
        source: "upload",
        target: "classification",
        type: isEdgeButtonDisabled ? NORMAL_EDGE : EDGE_WITH_BUTTON,
        selectable: false,
        focusable: false,
        animated: false,
        style: {
          stroke: edgeColor,
          strokeWidth: 1.5,
          strokeDasharray: "8 4",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
        },
        data: {
          disable: isEdgeButtonDisabled,
          workspaceId,
        },
      },
    ];
  }, [currentFlowStage, workspaceId]);

  return (
    <div className="h-[calc(100svh-4.0625rem)] min-h-140 w-full flex-1">
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
          maxZoom: INITIAL_FIT_VIEW_MAX_ZOOM,
        }}
        translateExtent={[
          [-300, -250],
          [1600, 900],
        ]}
        zoomOnDoubleClick={false}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap nodeStrokeWidth={3} />
      </ReactFlow>
    </div>
  );
}
