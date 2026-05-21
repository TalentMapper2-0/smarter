"use client";

import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  CheckCircle2Icon,
  DownloadIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";

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
  first_name: string | null;
  last_name: string | null;
  label: string | null;
  explanation: string | null;
  status: string | null;
};

type SortKey = "name" | "status" | "label" | "explanation";

type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

const defaultSort: SortState = {
  key: "name",
  direction: "asc",
};

export function ClassificationResultsTable({
  chatId,
  status,
  onStatusChangeAction,
}: ClassificationResultsTableProps) {
  const utils = trpc.useUtils();
  const { scrollToBottom } = useStickToBottomContext();

  const [sort, setSort] = useState<SortState>(defaultSort);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);
  const [realtimeRowsByChatId, setRealtimeRowsByChatId] = useState<
    Record<string, Record<string, CandidateClassificationRow | null>>
  >({});
  const [realtimeConnectedByChatId, setRealtimeConnectedByChatId] = useState<
    Record<string, boolean>
  >({});

  const isRealtimeConnected = realtimeConnectedByChatId[chatId] ?? false;

  const shouldPollRows =
    status === ChatStatus.ClassifyingCandidates && !isRealtimeConnected;

  const { data, isLoading } = trpc.candidates.listClassificationRows.useQuery(
    {
      chatId,
    },
    {
      refetchInterval: shouldPollRows ? 1500 : false,
    }
  );

  const classify = trpc.candidates.classify.useMutation({
    onSuccess: (result) => {
      onStatusChangeAction(result.flowStage);
      void utils.candidates.listClassificationRows.invalidate({ chatId });
      void utils.chat.listRecent.invalidate();
    },
  });

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isDisposed = false;

    const subscribe = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      console.log("Realtime auth before subscribe", {
        hasSession: Boolean(session),
        userId: session?.user.id,
        role: session?.user.role,
        error,
      });

      if (!session?.access_token) {
        console.warn("No Supabase session token, not subscribing to realtime");
        return;
      }

      supabase.realtime.setAuth(session.access_token);

      if (isDisposed) {
        return;
      }

      channel = supabase
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
              const oldRow =
                payload.old as Partial<CandidateClassificationDbRow>;
              const deletedRowId = oldRow.id;

              if (!deletedRowId) {
                return;
              }

              setRealtimeRowsByChatId((current) => ({
                ...current,
                [chatId]: {
                  ...(current[chatId] ?? {}),
                  [deletedRowId]: null,
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
        .subscribe((subscriptionStatus, err) => {
          console.log(`Supabase subscription status for chat ${chatId}:`, {
            subscriptionStatus,
            err,
          });

          setRealtimeConnectedByChatId((current) => ({
            ...current,
            [chatId]: subscriptionStatus === "SUBSCRIBED",
          }));
        });
    };

    void subscribe();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
    });

    return () => {
      isDisposed = true;
      subscription.unsubscribe();

      if (channel) {
        void supabase.removeChannel(channel);
      }
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

  const sortedRows = useMemo(() => sortRows(rows, sort), [rows, sort]);

  const settledRows = useMemo(
    () => rows.filter((row) => isSettledStatus(row.status)),
    [rows]
  );

  const failedRows = useMemo(
    () => rows.filter((row) => isFailedStatus(row.status)),
    [rows]
  );

  const hasRunningRows = rows.some((row) => isRunningStatus(row.status));
  const hasOpenRows = rows.some((row) => !isSettledStatus(row.status));

  const isClassifying =
    status === ChatStatus.ClassifyingCandidates ||
    classify.isPending ||
    hasRunningRows;

  const progressLabel = `${settledRows.length}/${rows.length}`;
  const canDownloadCsv = Boolean(rows.length) && !isClassifying && !hasOpenRows;

  useEffect(() => {
    scrollToBottom();
  }, [isClassifying, rows.length, scrollToBottom, settledRows.length]);

  useEffect(() => {
    if (status !== ChatStatus.ClassifyingCandidates || !rows.length) {
      return;
    }

    if (hasOpenRows) {
      return;
    }

    onStatusChangeAction(ChatStatus.ClassificationComplete);

    void utils.chat.listRecent.invalidate();
  }, [
    hasOpenRows,
    onStatusChangeAction,
    rows.length,
    status,
    utils.chat.listRecent,
  ]);

  const handleSort = (key: SortKey) => {
    setSort((currentSort) => {
      if (currentSort.key !== key) {
        return {
          key,
          direction: "asc",
        };
      }

      return {
        key,
        direction: currentSort.direction === "asc" ? "desc" : "asc",
      };
    });
  };

  const handleDownloadCsv = async () => {
    if (!canDownloadCsv || isDownloadingCsv) {
      return;
    }

    setIsDownloadingCsv(true);

    try {
      await waitForNextPaint();
      downloadCsv(rows, chatId);
    } finally {
      setIsDownloadingCsv(false);
    }
  };

  return (
    <Message from={ChatMessageRole.Assistant}>
      <MessageContent className="w-full">
        <div className="flex max-h-150 w-full max-w-full flex-col gap-3 overflow-hidden rounded-lg border bg-background">
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              {isClassifying ? (
                <Spinner className="size-4" />
              ) : (
                <CheckCircle2Icon className="size-4 text-muted-foreground" />
              )}

              <div className="min-w-0">
                <p className="truncate font-medium">Classificatieresultaten</p>
                <p className="text-xs text-muted-foreground">
                  {isClassifying ? "Live" : "Resultaten"} - {progressLabel}
                  {failedRows.length ? `, ${failedRows.length} mislukt` : ""}
                </p>
              </div>
            </div>

            <Button
              disabled={!canDownloadCsv || isDownloadingCsv}
              onClick={handleDownloadCsv}
              size="icon-sm"
              type="button"
              variant="outline"
            >
              {isDownloadingCsv ? (
                <Spinner className="size-4" />
              ) : (
                <DownloadIcon />
              )}
            </Button>
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
                  <SortableTableHead
                    activeSort={sort}
                    label="Kandidaat"
                    sortKey="name"
                    onSortAction={handleSort}
                  />
                  <TableHead>Status</TableHead>
                  <SortableTableHead
                    activeSort={sort}
                    label="Label"
                    sortKey="label"
                    onSortAction={handleSort}
                  />
                  <TableHead className="min-w-64">Uitleg</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sortedRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="min-w-36">
                        <p className="truncate font-medium">
                          {`${row.firstName} ${row.lastName}`.trim() ||
                            "Onbekend"}
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
                      {isRowLoading(row, isClassifying) ? (
                        <Skeleton className="h-5 w-24" />
                      ) : (
                        <span className="block max-w-36 truncate">
                          {row.label || "-"}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="max-w-96 whitespace-normal">
                      {isRowLoading(row, isClassifying) ? (
                        <div className="flex flex-col gap-1">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      ) : (
                        <span className="line-clamp-3 text-muted-foreground">
                          {row.explanation || "-"}
                        </span>
                      )}
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

function SortableTableHead({
  activeSort,
  className,
  label,
  sortKey,
  onSortAction,
}: {
  activeSort: SortState;
  className?: string;
  label: string;
  sortKey: SortKey;
  onSortAction: (key: SortKey) => void;
}) {
  const isActive = activeSort.key === sortKey;
  const SortIcon = !isActive
    ? ArrowUpDownIcon
    : activeSort.direction === "asc"
      ? ArrowUpIcon
      : ArrowDownIcon;

  return (
    <TableHead className={className}>
      <Button
        className="-ml-2"
        onClick={() => onSortAction(sortKey)}
        size="sm"
        type="button"
        variant="ghost"
      >
        {label}
        <SortIcon data-icon="inline-end" />
      </Button>
    </TableHead>
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
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
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

function isRowLoading(row: CandidateClassificationRow, isClassifying: boolean) {
  return isClassifying && !isSettledStatus(row.status);
}

function sortRows(rows: CandidateClassificationRow[], sort: SortState) {
  const direction = sort.direction === "asc" ? 1 : -1;

  return [...rows].sort((left, right) => {
    if (sort.key === "label") {
      const labelComparison =
        getLabelRank(left.label) - getLabelRank(right.label);

      if (labelComparison !== 0) {
        return labelComparison * direction;
      }
    }

    const valueComparison = getSortValue(left, sort.key).localeCompare(
      getSortValue(right, sort.key),
      "nl",
      { sensitivity: "base" }
    );

    if (valueComparison !== 0) {
      return valueComparison * direction;
    }

    const leftName = `${left.firstName} ${left.lastName}`.trim();
    const rightName = `${right.firstName} ${right.lastName}`.trim();

    return leftName.localeCompare(rightName, "nl", { sensitivity: "base" });
  });
}

function getSortValue(row: CandidateClassificationRow, key: SortKey) {
  switch (key) {
    case "label":
      return row.label;
    case "status":
      return row.status;
    case "explanation":
      return row.explanation;
    case "name":
      return `${row.firstName} ${row.lastName}`.trim();
  }
}

function getLabelRank(label: string) {
  const normalizedLabel = label.trim().toLowerCase();

  if (normalizedLabel === "fit") {
    return 0;
  }

  if (normalizedLabel === "moderate") {
    return 1;
  }

  if (
    normalizedLabel === "not fit" ||
    normalizedLabel === "not_fit" ||
    normalizedLabel === "no fit"
  ) {
    return 2;
  }

  return 3;
}

function downloadCsv(rows: CandidateClassificationRow[], chatId: string) {
  const headers = [
    "first_name",
    "last_name",
    "linkedin_url",
    "sales_navigator_id",
    "status",
    "label",
    "explanation",
  ];

  const csvRows = rows.map((row) => [
    row.firstName,
    row.lastName,
    row.linkedinUrl,
    row.salesNavigatorId,
    row.status,
    row.label,
    row.explanation,
  ]);

  const csv = [headers, ...csvRows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `classificatie-resultaten-${chatId}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}
