"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2Icon,
  PlayIcon,
  RefreshCwIcon,
  XCircleIcon,
} from "lucide-react";

import { Message, MessageContent } from "@/components/ai-elements/message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/trpc/client/client";
import type { CandidateClassificationRow } from "@/types/candidate";
import { ChatMessageRole, ChatStatus } from "@/types/chat";
import { createClient } from "@/utils/supabase/client";

type ClassificationResultsTableProps = {
  chatId: string;
  status: ChatStatus;
  onStatusChangeAction: (status: ChatStatus) => void;
};

type CandidateClassificationDbRow = {
  id: string;
  chat_id: string | null;
  linkedin_url: string | null;
  sales_navigator_id: string | null;
  name: string | null;
  label: string | null;
  explanation: string | null;
  status: string | null;
};

export function ClassificationResultsTable({
  chatId,
  status,
  onStatusChangeAction,
}: ClassificationResultsTableProps) {
  const utils = trpc.useUtils();

  const [realtimeRowsByChatId, setRealtimeRowsByChatId] = useState<
    Record<string, Record<string, CandidateClassificationRow | null>>
  >({});

  const { data, isLoading } = trpc.candidates.listClassificationRows.useQuery({
    chatId,
  });

  const classify = trpc.candidates.classify.useMutation({
    onSuccess: (result) => {
      onStatusChangeAction(result.flowStage);
      void utils.candidates.listClassificationRows.invalidate({ chatId });
      void utils.chat.listRecent.invalidate();
    },
  });

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`classify-candidates-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "classify_candidates",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Partial<CandidateClassificationDbRow>;

            if (!oldRow.id) {
              return;
            }

            setRealtimeRowsByChatId((current) => ({
              ...current,
              [chatId]: {
                ...(current[chatId] ?? {}),
                [oldRow.id as string]: null,
              },
            }));

            return;
          }

          const newRow = payload.new as CandidateClassificationDbRow;

          if (!newRow.id) {
            return;
          }

          setRealtimeRowsByChatId((current) => ({
            ...current,
            [chatId]: {
              ...(current[chatId] ?? {}),
              [newRow.id]: mapDbRowToClassificationRow(newRow),
            },
          }));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [chatId]);

  const rows = useMemo(() => {
    const rowsById = new Map((data ?? []).map((row) => [row.id, row]));

    for (const [id, row] of Object.entries(
      realtimeRowsByChatId[chatId] ?? {}
    )) {
      if (row) {
        rowsById.set(id, row);
      } else {
        rowsById.delete(id);
      }
    }

    return Array.from(rowsById.values());
  }, [chatId, data, realtimeRowsByChatId]);

  const classifiedRows = useMemo(
    () => rows.filter((row) => isClassifiedStatus(row.status)),
    [rows]
  );

  const failedRows = useMemo(
    () => rows.filter((row) => isFailedStatus(row.status)),
    [rows]
  );

  const hasRunningRows = rows.some((row) => isRunningStatus(row.status));

  const canStart =
    status === ChatStatus.ReadyToClassify ||
    status === ChatStatus.ClassificationFailed;

  const isClassifying =
    status === ChatStatus.ClassifyingCandidates ||
    classify.isPending ||
    hasRunningRows;

  const progressLabel = `${classifiedRows.length}/${rows.length}`;

  useEffect(() => {
    if (status !== ChatStatus.ClassifyingCandidates || !rows.length) {
      return;
    }

    const hasOpenRows = rows.some((row) => !isSettledStatus(row.status));

    if (hasOpenRows) {
      return;
    }

    onStatusChangeAction(
      failedRows.length
        ? ChatStatus.ClassificationFailed
        : ChatStatus.ClassificationComplete
    );

    void utils.chat.listRecent.invalidate();
  }, [
    failedRows.length,
    onStatusChangeAction,
    rows,
    status,
    utils.chat.listRecent,
  ]);

  return (
    <Message from={ChatMessageRole.Assistant}>
      <MessageContent className="w-full">
        <div className="flex w-full max-w-full flex-col gap-3 rounded-lg border bg-background">
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              {isClassifying ? (
                <Spinner className="size-4" />
              ) : failedRows.length ? (
                <XCircleIcon className="size-4 text-muted-foreground" />
              ) : (
                <CheckCircle2Icon className="size-4 text-muted-foreground" />
              )}

              <div className="min-w-0">
                <p className="truncate font-medium">Classificatieresultaten</p>
                <p className="text-xs text-muted-foreground">
                  {isClassifying ? "Live" : "Resultaten"} - {progressLabel}
                </p>
              </div>
            </div>

            {canStart ? (
              <Button
                disabled={classify.isPending || isLoading || !rows.length}
                onClick={() => {
                  void classify.mutateAsync({ chatId });
                }}
                size="sm"
              >
                {status === ChatStatus.ClassificationFailed ? (
                  <RefreshCwIcon data-icon="inline-start" />
                ) : (
                  <PlayIcon data-icon="inline-start" />
                )}
                {status === ChatStatus.ClassificationFailed
                  ? "Opnieuw starten"
                  : "Start classificatie"}
              </Button>
            ) : null}
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2 px-3 pb-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : rows.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kandidaat</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead className="min-w-64">Uitleg</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="min-w-36">
                        <p className="truncate font-medium">
                          {row.name || "Onbekend"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.linkedinUrl || row.salesNavigatorId || "-"}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>

                    <TableCell>
                      <span className="block max-w-36 truncate">
                        {row.label || "-"}
                      </span>
                    </TableCell>

                    <TableCell className="max-w-96 whitespace-normal">
                      <span className="line-clamp-3 text-muted-foreground">
                        {row.explanation || "-"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-3 pb-3 text-sm text-muted-foreground">
              Nog geen kandidaten gevonden.
            </div>
          )}
        </div>
      </MessageContent>
    </Message>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (isClassifiedStatus(status)) {
    return <Badge variant="secondary">Klaar</Badge>;
  }

  if (isFailedStatus(status)) {
    return <Badge variant="destructive">Mislukt</Badge>;
  }

  if (isRunningStatus(status)) {
    return <Badge variant="outline">Bezig</Badge>;
  }

  return <Badge variant="outline">Wachten</Badge>;
}

function mapDbRowToClassificationRow(
  row: CandidateClassificationDbRow
): CandidateClassificationRow {
  return {
    id: row.id,
    linkedinUrl: row.linkedin_url ?? "",
    salesNavigatorId: row.sales_navigator_id ?? "",
    name: row.name ?? "",
    label: row.label ?? "",
    explanation: row.explanation ?? "",
    status: row.status ?? "",
  };
}

function isRunningStatus(status: string) {
  return status === "classifying";
}

function isFailedStatus(status: string) {
  return status === "failed";
}

function isClassifiedStatus(status: string) {
  return Boolean(status) && !isRunningStatus(status) && !isFailedStatus(status);
}

function isSettledStatus(status: string) {
  return isClassifiedStatus(status) || isFailedStatus(status);
}