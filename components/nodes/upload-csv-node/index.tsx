"use client";

import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/nodes/base-node";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";

import { NodeStatus, NodeStatusIndicator } from "../../node-status-indicator";
import { UploadCsvDialog } from "./upload-csv-dialog";

export const UPLOAD_CSV_NODE = "uploadCsv";

export type UploadCsvNodeData = {
  status?: NodeStatus;
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
          style={{ opacity: 0 }}
        />

        <NodeStatusIndicator status={data?.status} variant="border">
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
          className="h-3! w-3! rounded-full! border-2! border-background! bg-primary!"
        />
      </div>
      <UploadCsvDialog open={open} onOpenChangeAction={setOpen} />
    </>
  );
});

UploadCsvNode.displayName = "UploadCsvNode";
