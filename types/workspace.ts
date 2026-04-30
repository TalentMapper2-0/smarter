import { NodeStatus } from "./note";

export enum WorkspaceFlowStage {
  NeedsCsv = "needs-csv",
  ReadyToClassify = "ready-to-classify",
  Classifying = "classifying",
  ClassificationFailed = "classification-failed",
  Complete = "complete",
}

export type WorkspaceFlowStateSnapshot = {
  flowStage: WorkspaceFlowStage;
};

export const defaultWorkspaceFlowState: WorkspaceFlowStateSnapshot = {
  flowStage: WorkspaceFlowStage.NeedsCsv,
};

export function getWorkspaceNodeStatuses(flowStage: WorkspaceFlowStage) {
  switch (flowStage) {
    case WorkspaceFlowStage.ReadyToClassify:
      return {
        uploadCsvStatus: NodeStatus.Success,
        candidateClassificationStatus: NodeStatus.Initial,
      };
    case WorkspaceFlowStage.Classifying:
      return {
        uploadCsvStatus: NodeStatus.Success,
        candidateClassificationStatus: NodeStatus.Loading,
      };
    case WorkspaceFlowStage.ClassificationFailed:
      return {
        uploadCsvStatus: NodeStatus.Success,
        candidateClassificationStatus: NodeStatus.Error,
      };
    case WorkspaceFlowStage.Complete:
      return {
        uploadCsvStatus: NodeStatus.Success,
        candidateClassificationStatus: NodeStatus.Success,
      };
    case WorkspaceFlowStage.NeedsCsv:
    default:
      return {
        uploadCsvStatus: NodeStatus.ActionRequired,
        candidateClassificationStatus: NodeStatus.Initial,
      };
  }
}

export type Workspace = {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  flowState: WorkspaceFlowStateSnapshot;
};
