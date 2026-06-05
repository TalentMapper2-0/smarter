
export const messages = {
  analysisStarted:
    "Hey! Laten we beginnen. Ik ga je helpen om je door het proces van sourcing te leiden.",
  analysisUploadRequest:
    "Upload de documenten die ik moet analyseren voor de sourcing.",
  chatInitialized: "Upload een CSV bestand om de sourcing te starten.",

  csvAnalyzing: "Ik analyseer je CSV-bestand.",

  csvColumnsMatched:
    "Goed nieuws, ik heb de kolommen gekoppeld. Je kunt doorgaan.",

  csvNeedsColumnMapping: "Koppel de CSV kolommen aan de juiste velden.",

  csvUploadNew:
    "Ik kon dit CSV-bestand niet gebruiken. Upload een nieuw CSV-bestand.",

  csvReuploadOk: "Oké, probeer het bestand opnieuw te uploaden.",
  vacancyRequest: "Plak de vacaturetekst hieronder.",
  commentRequest: "Wil je nog opmerkingen toevoegen?",
  commentTextRequest: "Typ je opmerkingen hieronder.",
  readyToClassify:
    "Dank je. Alles staat klaar om de kandidaten te classificeren.",
  chatClosed: "Deze chat is afgesloten.",
} as const;

export type MessageKey = keyof typeof messages;
