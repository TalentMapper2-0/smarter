"use client";

import { create } from "zustand";

import { NodeStatus } from "@/types/note";
import {
  defaultWorkspaceFlowState,
  type WorkspaceFlowStateSnapshot,
} from "@/types/workspace";

type WorkspaceFlowState = WorkspaceFlowStateSnapshot & {
  setWorkspaceFlow: (flowState: WorkspaceFlowStateSnapshot) => void;
  completeCsvUpload: () => void;
  startCandidateClassification: () => void;
  resetWorkspaceFlow: () => void;
};

export const useWorkspaceFlowStore = create<WorkspaceFlowState>((set, get) => ({
  ...defaultWorkspaceFlowState,
  setWorkspaceFlow: (flowState) => set(flowState),
  completeCsvUpload: () =>
    set({
      uploadCsvStatus: NodeStatus.Success,
      candidateClassificationStatus: NodeStatus.Initial,
      isEdgeButtonDisabled: false,
    }),
  startCandidateClassification: () => {
    if (get().isEdgeButtonDisabled) {
      return;
    }

    set({
      candidateClassificationStatus: NodeStatus.Loading,
      isEdgeButtonDisabled: true,
    });
  },
  resetWorkspaceFlow: () => set(defaultWorkspaceFlowState),
}));
