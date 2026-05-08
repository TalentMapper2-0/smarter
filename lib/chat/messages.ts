export const messages = {
  chatInitialized:
    "Je gesprek is gestart. Upload een CSV-bestand om te beginnen.",

  csvAnalyzing:
    "Ik analyseer je CSV-bestand.",

  csvColumnsMatched:
    "Goed nieuws, ik heb de kolommen gekoppeld. Je kunt doorgaan.",

  csvNeedsColumnMapping:
    "Ik heb de kolommen gevonden, maar ik kon ze niet allemaal met genoeg zekerheid koppelen. Koppel ze handmatig.",

  csvUploadNew:
    "Ik kon dit CSV-bestand niet gebruiken. Upload een nieuw CSV-bestand.",

  csvReuploadOk:
    "Oké, probeer het bestand opnieuw te uploaden.",
  vacancyRequest: "Plak de vacaturetekst hieronder.",
  vacancyUploaded: "Vacature succesvol geüpload. Heb je nog opmerkingen?",
} as const;

export type MessageKey = keyof typeof messages;
