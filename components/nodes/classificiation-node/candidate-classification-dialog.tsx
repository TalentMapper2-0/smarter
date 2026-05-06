"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TableHeader,
  Table,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/trpc/client/client";
import { createClient } from "@/utils/supabase/client";
import { ChevronLeftIcon, ExternalLinkIcon } from "lucide-react";
import { useEffect } from "react";

type Props = {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  workspaceId: string;
};

function getStatusVariant(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "success" || normalizedStatus === "classified") {
    return "default";
  }

  if (normalizedStatus === "failed") {
    return "destructive";
  }

  return "outline";
}

function getStatusLabel(status: string) {
  switch (status.toLowerCase()) {
    case "classifying":
      return "Classificeren";
    case "success":
      return "Voltooid";
    case "classified":
      return "Geclassificeerd";
    case "failed":
      return "Mislukt";
    default:
      return status;
  }
}

function CandidateStatus({ status }: { status: string }) {
  if (status.toLowerCase() === "classifying") {
    return (
      <Badge variant="outline" className="inline-flex items-center gap-1.5">
        <Spinner className="size-3 shrink-0" />
        {getStatusLabel(status)}
      </Badge>
    );
  }

  console.log("Rendering status badge with status:", status);
  console.log("Status variant:", getStatusVariant(status));

  return (
    <Badge variant={getStatusVariant(status)}>{getStatusLabel(status)}</Badge>
  );
}

export default function CandidateClassificationDialog({
  open,
  onOpenChangeAction,
  workspaceId,
}: Props) {
  const utils = trpc.useUtils();
  const rowsQuery = trpc.candidates.listClassificationRows.useQuery(
    { workspaceId },
    {
      enabled: open,
    }
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`classify-candidates-${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "classify_candidates",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          void utils.candidates.listClassificationRows.invalidate({
            workspaceId,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "classify_candidates",
        },
        () => {
          void utils.candidates.listClassificationRows.invalidate({
            workspaceId,
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [open, utils, workspaceId]);

  const rows = rowsQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="mb-8 flex h-[calc(100vh-2rem)] min-w-[calc(100vw-2rem)] flex-col justify-between gap-0 p-0">
        <ScrollArea className="flex flex-col justify-between overflow-hidden">
          <DialogHeader className="contents space-y-0 text-left">
            <DialogTitle className="px-6 pt-6">Kandidaten</DialogTitle>
            <DialogDescription asChild>
              <div className="p-6">
                <div className="w-full">
                  <div className="overflow-hidden rounded-md border">
                    <Table className="table-fixed">
                      <colgroup>
                        <col className="w-72" />
                        <col className="w-36" />
                        <col className="w-40" />
                        <col className="w-[32rem]" />
                        <col className="w-28" />
                      </colgroup>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kandidaat</TableHead>
                          <TableHead>Label</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Uitleg</TableHead>
                          <TableHead className="text-right">Profiel</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rowsQuery.isLoading ? (
                          Array.from({ length: 5 }).map((_, index) => (
                            <TableRow key={index}>
                              <TableCell colSpan={5}>
                                <Skeleton className="h-6 w-full" />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : rows.length > 0 ? (
                          rows.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                  <span className="truncate">
                                    {row.name || "Naam onbekend"}
                                  </span>
                                  {row.salesNavigatorId ? (
                                    <span className="truncate text-xs text-muted-foreground">
                                      {row.salesNavigatorId}
                                    </span>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell>
                                {row.label ? (
                                  <Badge variant="secondary">{row.label}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">
                                    Nog geen label
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {row.status ? (
                                  <CandidateStatus status={row.status} />
                                ) : (
                                  <Badge variant="outline">Wachtend</Badge>
                                )}
                              </TableCell>
                              <TableCell className="max-w-160 whitespace-normal text-muted-foreground">
                                {row.explanation || "Nog geen uitleg."}
                              </TableCell>
                              <TableCell className="text-right">
                                {row.linkedinUrl ? (
                                  <Button asChild variant="ghost" size="sm">
                                    <a
                                      href={row.linkedinUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <ExternalLinkIcon />
                                      Open
                                    </a>
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="h-32 text-center text-muted-foreground"
                            >
                              Nog geen kandidaten gevonden.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={4}>Totaal</TableCell>
                          <TableCell className="text-right">
                            {rows.length} kandidaten
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </ScrollArea>
        <DialogFooter className="mx-0 mb-0 px-6 py-4 sm:justify-end items-center">
          <DialogClose asChild>
            <Button variant="outline">
              <ChevronLeftIcon />
              Terug
            </Button>
          </DialogClose>
          {rowsQuery.isError ? (
            <Button type="button" onClick={() => void rowsQuery.refetch()}>
              Opnieuw laden
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
