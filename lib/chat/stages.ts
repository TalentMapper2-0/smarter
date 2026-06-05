import { ChatStatus } from "@/types/chat";

export type ChatStageId = "analysis" | "sourcing";

export type ChatStatusTone = "default" | "attention";

export type ChatStatusDefinition = {
  status: ChatStatus;
  label: string;
  description: string;
  tone?: ChatStatusTone;
};

export type ChatStageDefinition = {
  id: ChatStageId;
  label: string;
  description: string;
  statuses: readonly ChatStatusDefinition[];
};

export type ChatStageStatusState =
  | "complete"
  | "current"
  | "upcoming"
  | "attention";

export const chatStages = [
  {
    id: "analysis",
    label: "Analyse",
    description: "Verzamelt en controleert alles voor de kandidaat-analyse.",
    statuses: [
      {
        status: ChatStatus.Initialized,
        label: "Starten",
        description: "De analysefase wordt klaargezet.",
      },
      {
        status: ChatStatus.WaitingForAnalysisInput,
        label: "Documenten uploaden",
        description: "Wacht op documenten voor de analyse.",
      },
      {
        status: ChatStatus.AnalyzingDocuments,
        label: "Extractie",
        description: "Haalt de gevraagde velden uit de documenten.",
      },
      {
        status: ChatStatus.NeedsAnalysisFields,
        label: "Aanvullen",
        description: "Wacht op ontbrekende analysevelden.",
      },
    ],
  },
  {
    id: "sourcing",
    label: "Sourcing",
    description: "Gebruikt de analyse als basis voor de sourcingfase.",
    statuses: [
      {
        status: ChatStatus.WaitingForCsvInput,
        label: "CSV uploaden",
        description: "Wacht op het kandidatenbestand.",
      },
      {
        status: ChatStatus.MappingCsvColumns,
        label: "Kolommen lezen",
        description: "Leest het bestand en zoekt de juiste kolommen.",
      },
      {
        status: ChatStatus.NeedsCsvColumnMapping,
        label: "Kolommen koppelen",
        description: "Wacht tot de verplichte kolommen zijn gekoppeld.",
      },
      {
        status: ChatStatus.CsvColumnsMatched,
        label: "CSV klaar",
        description: "De kandidaten zijn opgeslagen voor analyse.",
      },
      {
        status: ChatStatus.WaitingForVacancy,
        label: "Vacature",
        description: "Wacht op de vacaturetekst.",
      },
      {
        status: ChatStatus.CommentRequest,
        label: "Context",
        description: "Controleert of extra opmerkingen nodig zijn.",
      },
      {
        status: ChatStatus.WaitingForComment,
        label: "Opmerking",
        description: "Wacht op aanvullende context.",
      },
      {
        status: ChatStatus.ReadyToClassify,
        label: "Klaarzetten",
        description: "Alles staat klaar om kandidaten te classificeren.",
      },
      {
        status: ChatStatus.ClassifyingCandidates,
        label: "Classificeren",
        description: "De kandidaten worden beoordeeld.",
      },
      {
        status: ChatStatus.ClassificationFailed,
        label: "Aandacht nodig",
        description: "De sourcing kon niet afgerond worden.",
        tone: "attention",
      },
      {
        status: ChatStatus.ClassificationComplete,
        label: "Sourcing klaar",
        description: "De sourcing is afgerond.",
      },
      {
        status: ChatStatus.Closed,
        label: "Afgesloten",
        description: "Deze chat is afgesloten.",
      },
    ],
  },
] as const satisfies readonly ChatStageDefinition[];

type StatusLookupValue = {
  stage: ChatStageDefinition;
  stageIndex: number;
  status: ChatStatusDefinition;
  statusIndex: number;
  flatIndex: number;
};

const statusLookup = new Map<ChatStatus, StatusLookupValue>();

let flatIndex = 0;

for (const [stageIndex, stage] of chatStages.entries()) {
  for (const [statusIndex, status] of stage.statuses.entries()) {
    statusLookup.set(status.status, {
      stage,
      stageIndex,
      status,
      statusIndex,
      flatIndex,
    });
    flatIndex += 1;
  }
}

const totalStatusCount = flatIndex;
const fallbackStatus = statusLookup.get(ChatStatus.Initialized);

export function getChatStatusDefinition(
  status: ChatStatus
): ChatStatusDefinition {
  return getStatusLookup(status).status;
}

export function getChatStageForStatus(status: ChatStatus): ChatStageDefinition {
  return getStatusLookup(status).stage;
}

export function getChatStageProgress(status: ChatStatus) {
  const activeStatus = getStatusLookup(status);
  const overallProgress = Math.round(
    ((activeStatus.flatIndex + 1) / totalStatusCount) * 100
  );

  return {
    activeStage: activeStatus.stage,
    activeStageIndex: activeStatus.stageIndex,
    activeStatus: activeStatus.status,
    activeStatusIndex: activeStatus.statusIndex,
    stages: chatStages,
    overallProgress,
  };
}

export function getChatStageStatusState(
  status: ChatStatusDefinition,
  currentStatus: ChatStatus
): ChatStageStatusState {
  const current = getStatusLookup(currentStatus);
  const target = getStatusLookup(status.status);

  if (status.status === currentStatus && status.tone === "attention") {
    return "attention";
  }

  if (status.status === currentStatus) {
    return "current";
  }

  return target.flatIndex < current.flatIndex ? "complete" : "upcoming";
}

function getStatusLookup(status: ChatStatus): StatusLookupValue {
  const lookup = statusLookup.get(status) ?? fallbackStatus;

  if (!lookup) {
    throw new Error(
      "Chat stage definitions are missing the initialized status."
    );
  }

  return lookup;
}
