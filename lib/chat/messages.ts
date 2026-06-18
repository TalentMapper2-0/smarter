export const messages = {
  agentSelectionRequest: "Welke agent wil je gebruiken?",
  agentSelectionRetry:
    "Kies een agent via de knoppen: SourcingAgent of AnalysisAgent.",
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
  analysisAgentSelected: "Hey je hebt de AnalysisAgent gekozen.",
  analysisSourcesRequest:
    "Plak tekst of URLs en voeg eventueel PDF-bestanden toe om de doelgroep te analyseren.",
  analysisFieldRequest: "Ik mis nog een veld. Vul dit veld aan.",
  analysisComplete: "Dank je. De doelgroepanalyse is compleet.",
  chatClosed: "Deze chat is afgesloten.",
} as const;

export type MessageKey = keyof typeof messages;
