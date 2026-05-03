"use client";

import { Background, Controls, MiniMap, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { useWorkspaceFlowStore } from "@/stores/workspace-flow-store";
import type { WorkspaceFlowStateSnapshot } from "@/types/workspace";
import type { UploadedCandidateData } from "@/core/repositories/candidates-repository";

import {
  edgeTypes,
  FLOW_NODE_ORIGIN,
  getWorkspaceFlowEdges,
  getWorkspaceFlowNodes,
  INITIAL_FIT_VIEW_MAX_ZOOM,
  nodeTypes,
  WORKSPACE_FLOW_TRANSLATE_EXTENT,
} from "./workspace-flow-config";
import { WorkspaceFlowLoader } from "./workspace-flow-loader";

export function WorkspaceFlow({
  workspaceId,
  initialFlowState,
  initialUploadData,
}: {
  workspaceId: string;
  initialFlowState: WorkspaceFlowStateSnapshot;
  initialUploadData: UploadedCandidateData | null;
}) {
  const [hasInitializedStore, setHasInitializedStore] = useState(false);

  const { storeWorkspaceId, flowStage, setWorkspaceFlow } =
    useWorkspaceFlowStore(
      useShallow((state) => ({
        storeWorkspaceId: state.workspaceId,
        flowStage: state.flowStage,
        setWorkspaceFlow: state.setWorkspaceFlow,
      }))
    );

  useEffect(() => {
    let isActive = true;

    setWorkspaceFlow(initialFlowState, workspaceId);

    queueMicrotask(() => {
      if (isActive) {
        setHasInitializedStore(true);
      }
    });

    return () => {
      isActive = false;
    };
  }, [initialFlowState, setWorkspaceFlow, workspaceId]);

  const isStoreReadyForWorkspace =
    storeWorkspaceId === workspaceId && flowStage !== null;

  const isFlowReady = hasInitializedStore && isStoreReadyForWorkspace;

  const currentFlowStage =
    isStoreReadyForWorkspace && flowStage !== null
      ? flowStage
      : initialFlowState.flowStage;

  const nodes = useMemo(
    () =>
      getWorkspaceFlowNodes({
        flowStage: currentFlowStage,
        workspaceId,
        initialUploadData,
      }),
    [currentFlowStage, workspaceId, initialUploadData]
  );

  const edges = useMemo(
    () =>
      getWorkspaceFlowEdges({
        flowStage: currentFlowStage,
        workspaceId,
      }),
    [currentFlowStage, workspaceId]
  );

  if (!isFlowReady) {
    return <WorkspaceFlowLoader />;
  }

  return (
    <div className="h-[calc(100svh-4.0625rem)] min-h-140 w-full flex-1">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodeOrigin={FLOW_NODE_ORIGIN}
        proOptions={{ hideAttribution: true }}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        // elementsSelectable={false}
        panOnDrag
        fitViewOptions={{
          padding: 0.8,
          maxZoom: INITIAL_FIT_VIEW_MAX_ZOOM,
        }}
        translateExtent={WORKSPACE_FLOW_TRANSLATE_EXTENT}
        zoomOnDoubleClick={false}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap nodeStrokeWidth={3} />
      </ReactFlow>
    </div>
  );
}
