import {
  ArrowRightIcon,
  BrainCircuitIcon,
  CheckCircle2Icon,
  Clock3Icon,
  FileSpreadsheetIcon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import WorkspacesService from "@/core/services/workspaces-service";
import { createServerContext } from "@/trpc/server/caller";
import {
  getWorkspaceNodeStatuses,
  type Workspace,
  WorkspaceFlowStage,
} from "@/types/workspace";
import { NodeStatus } from "@/types/note";

function getFirstName(email: string) {
  const name = email
    .split("@")[0]
    ?.replace(/[._-]+/g, " ")
    .trim();

  if (!name) {
    return "daar";
  }

  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getCompletedSteps(workspace: Workspace) {
  const { uploadCsvStatus, candidateClassificationStatus } =
    getWorkspaceNodeStatuses(workspace.flowState.flowStage);
  const statuses = [uploadCsvStatus, candidateClassificationStatus];

  return statuses.filter((status) => status === NodeStatus.Success).length;
}

function getWorkspaceStatus(workspace: Workspace) {
  switch (workspace.flowState.flowStage) {
    case WorkspaceFlowStage.Complete:
      return "Klaar";
    case WorkspaceFlowStage.Classifying:
      return "Bezig";
    case WorkspaceFlowStage.ClassificationFailed:
      return "Aandacht nodig";
    case WorkspaceFlowStage.ReadyToClassify:
      return "Wachten op classificatie";
    case WorkspaceFlowStage.NeedsCsv:
    default:
      return "In voorbereiding";
  }
}

export default async function Page() {
  const ctx = await createServerContext();
  const workspaces = ctx.user ? await WorkspacesService.listRecent(ctx) : [];
  const latestWorkspace = workspaces[0];
  const completedWorkspaces = workspaces.filter(
    (workspace) => getWorkspaceStatus(workspace) === "Klaar"
  ).length;
  const waitingWorkspaces = workspaces.filter((workspace) =>
    [
      WorkspaceFlowStage.NeedsCsv,
      WorkspaceFlowStage.ReadyToClassify,
      WorkspaceFlowStage.ClassificationFailed,
    ].includes(workspace.flowState.flowStage)
  ).length;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex min-h-70 flex-col justify-between rounded-xl bg-primary p-6 text-primary-foreground md:p-8">
          <div className="flex flex-col gap-4">
            <Badge variant="secondary" className="w-fit">
              Slimmer werven
            </Badge>
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Goed om je te zien, {getFirstName(ctx.user?.email ?? "")}.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-primary-foreground/80 md:text-base">
                Bouw je recruitmentflow verder uit, upload kandidaten en laat
                Smarter het eerste sorteerwerk voor je doen.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {latestWorkspace ? (
              <Button asChild variant="secondary">
                <Link href={`/p/${latestWorkspace.id}`}>
                  Open laatste project
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>{workspaces.length}</CardTitle>
              <CardDescription>Recente projecten</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{completedWorkspaces}</CardTitle>
              <CardDescription>Flows afgerond</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{waitingWorkspaces}</CardTitle>
              <CardDescription>Wachten op input</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card id="projecten">
          <CardHeader>
            <CardTitle>Recente projecten</CardTitle>
            <CardDescription>
              Je laatste werkruimtes, met de huidige status van de flow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workspaces.length > 0 ? (
              <div className="flex flex-col gap-3">
                {workspaces.map((workspace) => (
                  <Link
                    key={workspace.id}
                    href={`/p/${workspace.id}`}
                    className="group flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <BrainCircuitIcon className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {workspace.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Aangemaakt op {formatDate(workspace.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:justify-end">
                      <Badge variant="outline">
                        {getWorkspaceStatus(workspace)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {getCompletedSteps(workspace)}/2 stappen
                      </span>
                      <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <FileSpreadsheetIcon className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Nog geen projecten</p>
                  <p className="text-sm text-muted-foreground">
                    Maak je eerste project aan via de zijbalk.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflow</CardTitle>
            <CardDescription>
              De vaste route van ruwe kandidaten naar bruikbare selectie.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <FileSpreadsheetIcon className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Upload kandidaten</p>
                <p className="text-sm text-muted-foreground">
                  Start met een CSV en koppel de juiste kolommen.
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <SparklesIcon className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Laat classificeren</p>
                <p className="text-sm text-muted-foreground">
                  Verrijk profielen met consistente, snelle beoordeling.
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <CheckCircle2Icon className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Werk verder met focus</p>
                <p className="text-sm text-muted-foreground">
                  Gebruik de uitkomsten om sneller te vergelijken.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardAction>
              <Clock3Icon className="size-4 text-muted-foreground" />
            </CardAction>
            <CardTitle>Snel hervatten</CardTitle>
            <CardDescription>
              Pak de laatste flow op zonder opnieuw te zoeken.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardAction>
              <FileSpreadsheetIcon className="size-4 text-muted-foreground" />
            </CardAction>
            <CardTitle>CSV naar overzicht</CardTitle>
            <CardDescription>
              Kandidaten komen direct in een gestructureerde werkruimte.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardAction>
              <SparklesIcon className="size-4 text-muted-foreground" />
            </CardAction>
            <CardTitle>AI als voorselectie</CardTitle>
            <CardDescription>
              Laat herhaalbaar beoordelingswerk sneller verlopen.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </main>
  );
}
