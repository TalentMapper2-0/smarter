import {
  EMPTY_MAPPING,
  HEADER_ALIASES,
  REQUIRED_FIELDS,
  type ColumnMapping,
  type ParsedCsvRow,
} from "./constants";

export function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function splitCsvLine(line: string) {
  const values: string[] = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
        continue;
      }

      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === "," && !insideQuotes) {
      values.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue.trim());

  return values;
}

export function parseCsv(text: string) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      columns: [],
      rows: [],
    };
  }

  const columns = splitCsvLine(lines[0]).map(
    (column, index) => column || `Kolom ${index + 1}`
  );

  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);

    return columns.reduce<ParsedCsvRow>((row, column, index) => {
      row[column] = values[index] ?? "";
      return row;
    }, {});
  });

  return { columns, rows };
}

export function createEmptyMapping(): ColumnMapping {
  return { ...EMPTY_MAPPING };
}

export function suggestMapping(columns: string[]): ColumnMapping {
  return REQUIRED_FIELDS.reduce<ColumnMapping>((mapping, field) => {
    const aliases = HEADER_ALIASES[field];
    const exactMatch = columns.find(
      (column) =>
        normalizeHeader(column) === normalizeHeader(field) ||
        aliases.includes(normalizeHeader(column))
    );

    mapping[field] = exactMatch ?? "";

    return mapping;
  }, createEmptyMapping());
}