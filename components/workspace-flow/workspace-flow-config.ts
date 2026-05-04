import type { UploadedCandidateData } from "@/core/repositories/candidates-repository";
import {
  MarkerType,
  type CoordinateExtent,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeOrigin,
  type NodeTypes,
} from "@xyflow/react";

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
import {
  getWorkspaceNodeStatuses,
  WorkspaceFlowStage,
} from "@/types/workspace";

export const nodeTypes = {
  [CANDIDATE_CLASSIFICATION_NODE]: CandidateClassificationNode,
  [UPLOAD_CSV_NODE]: UploadCsvNode,
} satisfies NodeTypes;

export const edgeTypes = {
  [EDGE_WITH_BUTTON]: EdgeWithButton,
  [NORMAL_EDGE]: NormalEdge,
} satisfies EdgeTypes;

export type WorkspaceNode = Node<
  CandidateClassificationNodeData | UploadCsvNodeData
>;

export const edgeColor = "var(--muted-foreground/50)";

export const DEFAULT_NODE_SIZE = {
  width: 256,
  height: 112,
} as const;

export const INITIAL_FIT_VIEW_MAX_ZOOM = 0.9;
export const FLOW_NODE_ORIGIN = [0.5, 0.5] satisfies NodeOrigin;
export const WORKSPACE_FLOW_TRANSLATE_EXTENT = [
  [-1800, -1200],
  [1800, 1200],
] satisfies CoordinateExtent;

export const NODE_Y = 0;
export const NODE_GAP = 220;

export const UPLOAD_NODE_POSITION = {
  x: -(NODE_GAP + DEFAULT_NODE_SIZE.width) / 2,
  y: NODE_Y,
} as const;

export const CLASSIFICATION_NODE_POSITION = {
  x: (NODE_GAP + DEFAULT_NODE_SIZE.width) / 2,
  y: NODE_Y,
} as const;

export function withDefaultNodeSize<TNode extends WorkspaceNode>(
  node: TNode
): TNode {
  return withNodeSize(node, DEFAULT_NODE_SIZE);
}

function withNodeSize<TNode extends WorkspaceNode>(
  node: TNode,
  size: typeof DEFAULT_NODE_SIZE
): TNode {
  return {
    ...node,
    initialWidth: size.width,
    initialHeight: size.height,
    style: {
      width: size.width,
      height: size.height,
      ...node.style,
    },
  };
}

export function getWorkspaceFlowNodes({
  flowStage,
  workspaceId,
  initialUploadData,
}: {
  flowStage: WorkspaceFlowStage;
  workspaceId: string;
  initialUploadData: UploadedCandidateData | null;
}): WorkspaceNode[] {
  const { uploadCsvStatus, candidateClassificationStatus } =
    getWorkspaceNodeStatuses(flowStage);

  const uploadNode: WorkspaceNode = withDefaultNodeSize({
    id: "upload",
    type: UPLOAD_CSV_NODE,
    position: UPLOAD_NODE_POSITION,
    data: {
      status: uploadCsvStatus,
      workspaceId,
      initialUploadData,
      isLocked:
        flowStage !== WorkspaceFlowStage.NeedsCsv &&
        flowStage !== WorkspaceFlowStage.ReadyToClassify,
    },
    draggable: false,
  });

  const classificationNodeSize = DEFAULT_NODE_SIZE;

  const classificationNode: WorkspaceNode = withNodeSize(
    {
      id: "classification",
      type: CANDIDATE_CLASSIFICATION_NODE,
      position: CLASSIFICATION_NODE_POSITION,
      data: {
        status: candidateClassificationStatus,
      },
      draggable: false,
    },
    classificationNodeSize
  );

  return [uploadNode, classificationNode];
}

export function getWorkspaceFlowEdges({
  flowStage,
  workspaceId,
  onClassify,
}: {
  flowStage: WorkspaceFlowStage;
  workspaceId: string;
  onClassify: () => void;
}): Edge[] {
  const canClassify =
    flowStage === WorkspaceFlowStage.ReadyToClassify ||
    flowStage === WorkspaceFlowStage.ClassificationFailed;
  const isEdgeButtonDisabled = !canClassify;

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
        onClassify,
      },
    },
  ];
}
