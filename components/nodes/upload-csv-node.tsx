"use client";

import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/nodes/base-node";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { NodeStatus, NodeStatusIndicator } from "../node-status-indicator";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import z from "zod";
import { Controller, useForm } from "react-hook-form";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "../ui/field";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import { Send } from "lucide-react";
import { Input } from "../ui/input";

export const UPLOAD_CSV_NODE = "uploadCsv";

export type UploadCsvNodeData = {
  status?: NodeStatus;
};

export type UploadCsvFlowNode = Node<UploadCsvNodeData, typeof UPLOAD_CSV_NODE>;

export const UploadCsvNode = memo(({ data }: NodeProps<UploadCsvFlowNode>) => {
  const [open, setOpen] = useState(false);

  function handleClick() {
    console.log("Clicked upload node");
    setOpen(true);
  }

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
            onClick={handleClick}
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
      <DrawerDialog open={open} onOpenChange={setOpen} />
    </>
  );
});

UploadCsvNode.displayName = "UploadCsvNode";

const TEXT = {
  title: "CSV uploaden",
  description: "Klik om een CSV te uploaden.",
};

function DrawerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>{TEXT.title}</DialogTitle>
            <DialogDescription>{TEXT.description}</DialogDescription>
          </DialogHeader>
          <CandidateUploadForm />
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{TEXT.title}</DrawerTitle>
          <DrawerDescription>{TEXT.description}</DrawerDescription>
        </DrawerHeader>
        <CandidateUploadForm className="px-4" />
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

const formSchema = z.object({
  file: z
    .unknown()
    .transform((value) => {
      if (typeof FileList !== "undefined" && value instanceof FileList) {
        return value.item(0) ?? undefined;
      }

      if (typeof File !== "undefined" && value instanceof File) {
        return value;
      }

      return undefined;
    })
    .refine((file) => !!file, { message: "Bestand is vereist" })
    .refine(
      (file) =>
        !file ||
        file.type === "text/csv" ||
        file.name.toLowerCase().endsWith(".csv"),
      { message: "Bestand moet een CSV zijn" }
    ),
});

function CandidateUploadForm({ className }: { className?: string }) {
  const form = useForm<
    z.input<typeof formSchema>,
    undefined,
    z.output<typeof formSchema>
  >({
    resolver: zodResolver(formSchema),
    defaultValues: {
      file: undefined,
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    
  }

  const isSubmitting = form.formState.isSubmitting;
  const isSubmittable = form.formState.isValid && !isSubmitting;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
      <FieldSet>
        <FieldGroup>
          <Controller
            control={form.control}
            name="file"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => field.onChange(e.target.files)}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Field className="flex justify-end" orientation="horizontal">
            <Button type="submit" disabled={!isSubmittable}>
              Uploaden
              {isSubmitting ? <Spinner /> : <Send />}
            </Button>
          </Field>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}
