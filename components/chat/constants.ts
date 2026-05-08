export const TEXT = {
  title: "Uploadgegevens toevoegen",
  description:
    "Upload een CSV, voeg de vacature toe en koppel de kolommen aan de juiste velden.",
};

export const REQUIRED_FIELDS = [
  "linkedinUrl",
  "salesNavigatorId",
  "firstName",
  "lastName",
] as const;

export type RequiredField = (typeof REQUIRED_FIELDS)[number];

export type ParsedCsvRow = Record<string, string>;
export type MappedCsvRow = Record<RequiredField, string>;

export type ColumnMapping = Record<RequiredField, string>;

export const EMPTY_MAPPING: ColumnMapping = {
  linkedinUrl: "",
  salesNavigatorId: "",
  firstName: "",
  lastName: "",
};

export const FIELD_LABELS: Record<RequiredField, string> = {
  linkedinUrl: "LinkedIn URL",
  salesNavigatorId: "Sales Navigator ID",
  firstName: "Voornaam",
  lastName: "Achternaam",
};

export const HEADER_ALIASES: Record<RequiredField, string[]> = {
  linkedinUrl: [
    "linkedin",
    "linkedinurl",
    "linkedinprofile",
    "linkedinprofileurl",
    "profileurl",
    "url",
    "publicprofileurl",
  ],
  salesNavigatorId: [
    "salesnavigatorid",
    "salesnavid",
    "salesnavigator",
    "salesnavigatorprofileid",
    "leadid",
    "snid",
  ],
  firstName: ["firstname", "first", "givenname", "voornaam", "namefirst"],
  lastName: ["lastname", "last", "surname", "familyname", "achternaam"],
};