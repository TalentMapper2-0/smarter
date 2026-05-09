export const messages = {
  chatInitialized:
    "Je gesprek is gestart. Upload een CSV-bestand om te beginnen.",

  csvAnalyzing: "Ik analyseer je CSV-bestand.",

  csvColumnsMatched:
    "Goed nieuws, ik heb de kolommen gekoppeld. Je kunt doorgaan.",

  csvNeedsColumnMapping:
    "Ik heb de kolommen gevonden, maar ik kon ze niet allemaal met genoeg zekerheid koppelen. Koppel ze handmatig.",

  csvUploadNew:
    "Ik kon dit CSV-bestand niet gebruiken. Upload een nieuw CSV-bestand.",

  csvReuploadOk: "Oké, probeer het bestand opnieuw te uploaden.",
  vacancyRequest: "Plak de vacaturetekst hieronder.",
  commentRequest:
    "Vacature succesvol geüpload. Wil je nog opmerkingen toevoegen?",
  commentTextRequest: "Typ je opmerkingen hieronder.",
  readyToClassify:
    "Dank je. Alles staat klaar om de kandidaten te classificeren.",
  chatClosed: "Deze chat is afgesloten.",
} as const;

export type MessageKey = keyof typeof messages;
