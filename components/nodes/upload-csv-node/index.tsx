"use client";

import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/nodes/base-node";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";

import { NodeStatusIndicator } from "../../node-status-indicator";
import { UploadCsvDialog } from "./upload-csv-dialog";
import { NodeStatus } from "@/types/note";

export const UPLOAD_CSV_NODE = "uploadCsv";

const edgeAnchorStyle = {
  width: 1,
  height: 1,
  minWidth: 1,
  minHeight: 1,
  border: 0,
  background: "transparent",
  opacity: 0,
  transform: "translateY(-50%)",
};

export type UploadCsvNodeData = {
  status?: NodeStatus;
  actionRequiredMessage?: string;
  workspaceId: string;
};

export type UploadCsvFlowNode = Node<UploadCsvNodeData, typeof UPLOAD_CSV_NODE>;

export const UploadCsvNode = memo(({ data }: NodeProps<UploadCsvFlowNode>) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="relative">
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={false}
          style={edgeAnchorStyle}
        />

        <NodeStatusIndicator
          status={data?.status}
          variant="border"
          actionRequiredMessage={data?.actionRequiredMessage}
        >
          <BaseNode
            onClick={() => setOpen(true)}
            className="min-w-64 transition hover:shadow-md"
          >
            <BaseNodeHeader>
              <BaseNodeHeaderTitle>CSV uploaden</BaseNodeHeaderTitle>
            </BaseNodeHeader>
            <BaseNodeContent className="pt-0 text-sm text-muted-foreground">
              Klik om een CSV te uploaden en het proces te starten.
            </BaseNodeContent>
          </BaseNode>
        </NodeStatusIndicator>

        <Handle
          type="source"
          position={Position.Right}
          isConnectable={false}
          style={edgeAnchorStyle}
        />
      </div>
      <UploadCsvDialog
        open={open}
        onOpenChangeAction={setOpen}
        workspaceId={data.workspaceId}
      />
    </>
  );
});

UploadCsvNode.displayName = "UploadCsvNode";
