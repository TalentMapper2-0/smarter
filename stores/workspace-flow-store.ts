"use client";

import { create } from "zustand";

import {
  defaultWorkspaceFlowState,
  type WorkspaceFlowStateSnapshot,
  WorkspaceFlowStage,
} from "@/types/workspace";

type WorkspaceFlowState = Omit<WorkspaceFlowStateSnapshot, "flowStage"> & {
  flowStage: WorkspaceFlowStage | null;
  workspaceId: string | null;
  setWorkspaceFlow: (
    flowState: WorkspaceFlowStateSnapshot,
    workspaceId?: string
  ) => void;
  completeCsvUpload: () => void;
  startCandidateClassification: () => void;
  resetWorkspaceFlow: () => void;
};

export const useWorkspaceFlowStore = create<WorkspaceFlowState>((set, get) => ({
  ...defaultWorkspaceFlowState,
  flowStage: null,
  workspaceId: null,

  setWorkspaceFlow: (flowState, workspaceId) =>
    set((state) => ({
      ...flowState,
      workspaceId: workspaceId ?? state.workspaceId,
    })),

  completeCsvUpload: () =>
    set({
      flowStage: WorkspaceFlowStage.ReadyToClassify,
    }),

  startCandidateClassification: () => {
    if (
      get().flowStage !== WorkspaceFlowStage.ReadyToClassify &&
      get().flowStage !== WorkspaceFlowStage.ClassificationFailed
    ) {
      return;
    }

    set({
      flowStage: WorkspaceFlowStage.Classifying,
    });
  },

  resetWorkspaceFlow: () =>
    set({
      ...defaultWorkspaceFlowState,
      flowStage: null,
      workspaceId: null,
    }),
}));
