export const messages = {
  chatInitialized: "Upload een CSV bestand om te beginnen.",

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
