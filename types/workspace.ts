import { NodeStatus } from "./note";

export type WorkspaceFlowStateSnapshot = {
  uploadCsvStatus: NodeStatus;
  candidateClassificationStatus: NodeStatus;
  isEdgeButtonDisabled: boolean;
};

export const defaultWorkspaceFlowState: WorkspaceFlowStateSnapshot = {
  uploadCsvStatus: NodeStatus.ActionRequired,
  candidateClassificationStatus: NodeStatus.Initial,
  isEdgeButtonDisabled: true,
};

export type Workspace = {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  flowState: WorkspaceFlowStateSnapshot;
};
