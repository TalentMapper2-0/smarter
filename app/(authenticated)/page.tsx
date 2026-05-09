import {
  ArrowRightIcon,
  BrainCircuitIcon,
  CheckCircle2Icon,
  Clock3Icon,
  FileSpreadsheetIcon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import ChatsService from "@/core/services/chats-service";
import { createServerContext } from "@/trpc/server/caller";
import { Chat, ChatStatus } from "@/types/chat";

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

function getCompletedSteps(chat: Chat) {
  const isUploadComplete =
    chat.status === ChatStatus.CsvColumnsMatched ||
    chat.status === ChatStatus.WaitingForVacancy ||
    chat.status === ChatStatus.CommentRequest ||
    chat.status === ChatStatus.WaitingForComment ||
    chat.status === ChatStatus.ReadyToClassify ||
    chat.status === ChatStatus.ClassifyingCandidates ||
    chat.status === ChatStatus.ClassificationComplete ||
    chat.status === ChatStatus.ClassificationFailed ||
    chat.status === ChatStatus.Closed;

  const isClassificationComplete =
    chat.status === ChatStatus.ClassificationComplete ||
    chat.status === ChatStatus.Closed;

  const isVacancyComplete =
    chat.status === ChatStatus.CommentRequest ||
    chat.status === ChatStatus.WaitingForComment ||
    chat.status === ChatStatus.ReadyToClassify ||
    chat.status === ChatStatus.ClassifyingCandidates ||
    chat.status === ChatStatus.ClassificationComplete ||
    chat.status === ChatStatus.Closed;

  let completed = 0;
  if (isUploadComplete) completed += 1;
  if (isVacancyComplete) completed += 1;
  if (isClassificationComplete) completed += 1;

  return completed;
}

function getChatStatus(chat: Chat) {
  switch (chat.status) {
    case ChatStatus.ClassificationComplete:
      return "Klaar";
    case ChatStatus.Closed:
      return "Afgesloten";
    case ChatStatus.ClassifyingCandidates:
      return "Bezig met classificatie";
    case ChatStatus.ClassificationFailed:
      return "Aandacht nodig (Classificatie gefaald)";
    case ChatStatus.ReadyToClassify:
      return "Wachten op classificatie";
    case ChatStatus.CommentRequest:
      return "Opmerking bevestigen";
    case ChatStatus.WaitingForComment:
      return "Wachten op opmerking";
    case ChatStatus.WaitingForVacancy:
      return "Wachten op vacature";
    case ChatStatus.CsvColumnsMatched:
      return "Kolommen gekoppeld";
    case ChatStatus.NeedsCsvColumnMapping:
      return "Kolommen koppelen";
    case ChatStatus.MappingCsvColumns:
      return "Bezig met inlezen";
    case ChatStatus.WaitingForCsvInput:
      return "Wachten op CSV";
    case ChatStatus.Initialized:
    default:
      return "In voorbereiding";
  }
}

export default async function Page() {
  const ctx = await createServerContext();
  const chats = ctx.user ? await ChatsService.listRecent(ctx) : [];
  const latestChat = chats[0];
  const completedChats = chats.filter(
    (chat) => getChatStatus(chat) === "Klaar"
  ).length;
  const waitingChats = chats.filter((chat) =>
    [
      ChatStatus.WaitingForCsvInput,
      ChatStatus.NeedsCsvColumnMapping,
      ChatStatus.CsvColumnsMatched,
      ChatStatus.WaitingForVacancy,
      ChatStatus.CommentRequest,
      ChatStatus.WaitingForComment,
      ChatStatus.ReadyToClassify,
      ChatStatus.ClassificationFailed,
    ].includes(chat.status)
  ).length;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 md:p-6">
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
            {latestChat ? (
              <Button asChild variant="secondary">
                <Link href={`/c/${latestChat.id}`}>
                  Open laatste chat
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>{chats.length}</CardTitle>
              <CardDescription>Recente chats</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{completedChats}</CardTitle>
              <CardDescription>Flows afgerond</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{waitingChats}</CardTitle>
              <CardDescription>Wachten op input</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card id="projecten">
          <CardHeader>
            <CardTitle>Recente chats</CardTitle>
            <CardDescription>
              Je laatste chats, met de huidige status van de flow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chats.length > 0 ? (
              <div className="flex flex-col gap-3">
                {chats.map((chat) => (
                  <Link
                    key={chat.id}
                    href={`/c/${chat.id}`}
                    className="group flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <BrainCircuitIcon className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{chat.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Aangemaakt op {formatDate(chat.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:justify-end">
                      <Badge variant="outline">{getChatStatus(chat)}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {getCompletedSteps(chat)}/3 stappen
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
                  <p className="font-medium">Nog geen chats</p>
                  <p className="text-sm text-muted-foreground">
                    Start je eerste chat via de zijbalk.
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
