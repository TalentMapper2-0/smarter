import type {
  AnalysisFieldKey,
  AnalysisFields,
  AnalysisFieldValue,
} from "@/types/chat";

export const analysisFieldDefinitions = [
  {
    key: "seniority",
    label: "Seniority",
  },
  {
    key: "region",
    label: "Regio",
  },
  {
    key: "must_have_skills",
    label: "Must-have skills",
  },
  {
    key: "education",
    label: "Opleiding",
  },
  {
    key: "company_size",
    label: "Bedrijfsgrootte",
  },
] as const satisfies readonly {
  key: AnalysisFieldKey;
  label: string;
}[];

export const requestedAnalysisFields = analysisFieldDefinitions.map(
  (field) => field.key
);

export type AnalysisAgentResult = {
  fields: AnalysisFields;
  previousResponseId: string | null;
  raw: unknown;
};

export function getAnalysisFieldLabel(field: AnalysisFieldKey) {
  return (
    analysisFieldDefinitions.find((definition) => definition.key === field)
      ?.label ?? field
  );
}

export function mergeAnalysisFields(
  currentFields: AnalysisFields,
  nextFields: AnalysisFields
): AnalysisFields {
  const merged: AnalysisFields = {
    ...currentFields,
  };

  for (const field of requestedAnalysisFields) {
    const nextValue = nextFields[field];

    if (!isEmptyAnalysisValue(nextValue)) {
      merged[field] = nextValue;
    } else if (!(field in merged)) {
      merged[field] = nextValue ?? null;
    }
  }

  return merged;
}

export function getMissingAnalysisFields(fields: AnalysisFields) {
  return requestedAnalysisFields.filter((field) =>
    isEmptyAnalysisValue(fields[field])
  );
}

export function formatAnalysisFieldList(fields: AnalysisFieldKey[]) {
  return fields.map(getAnalysisFieldLabel).join(", ");
}

export function formatAnalysisHandoff(
  fields: AnalysisFields,
  previousResponseId: string | null
) {
  const payload = {
    conversation_id: previousResponseId,
    ...requestedAnalysisFields.reduce<
      Record<AnalysisFieldKey, AnalysisFieldValue>
    >(
      (result, field) => ({
        ...result,
        [field]: fields[field] ?? null,
      }),
      {
        seniority: null,
        region: null,
        must_have_skills: null,
        education: null,
        company_size: null,
      }
    ),
  };

  return JSON.stringify(payload, null, 2);
}

export function normalizeAnalysisAgentResult(
  value: unknown
): AnalysisAgentResult {
  return {
    fields: normalizeAnalysisFields(value),
    previousResponseId: findResponseId(value),
    raw: value,
  };
}

export function normalizeAnalysisFields(value: unknown): AnalysisFields {
  const fields: AnalysisFields = {};

  for (const field of requestedAnalysisFields) {
    fields[field] = normalizeAnalysisFieldValue(findFieldValue(value, field));
  }

  return fields;
}

export function isEmptyAnalysisValue(value: unknown) {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
}

function normalizeAnalysisFieldValue(value: unknown): AnalysisFieldValue {
  if (value === undefined) {
    return null;
  }

  if (value === null) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean"
        ) {
          return String(item);
        }

        return null;
      })
      .filter((item): item is string => Boolean(item));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if ("value" in record) {
      return normalizeAnalysisFieldValue(record.value);
    }
  }

  return JSON.stringify(value);
}

function findFieldValue(value: unknown, field: AnalysisFieldKey): unknown {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFieldValue(item, field);

      if (found !== undefined) {
        return found;
      }
    }

    return undefined;
  }

  const record = value as Record<string, unknown>;

  if (field in record) {
    return record[field];
  }

  for (const [key, child] of Object.entries(record)) {
    if (key === "requested_fields") {
      continue;
    }

    const found = findFieldValue(child, field);

    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

function findResponseId(value: unknown): string | null {
  return (
    findStringValue(value, [
      "response_id",
      "conversation_id",
      "previous_response_id",
      "previousResponseId",
    ]) ??
    findResponseLikeId(value) ??
    null
  );
}

function findStringValue(value: unknown, keys: string[]): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringValue(item, keys);

      if (found) {
        return found;
      }
    }

    return undefined;
  }

  const record = value as Record<string, unknown>;

  for (const key of keys) {
    const candidate = record[key];

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  for (const child of Object.values(record)) {
    const found = findStringValue(child, keys);

    if (found) {
      return found;
    }
  }

  return undefined;
}

function findResponseLikeId(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findResponseLikeId(item);

      if (found) {
        return found;
      }
    }

    return undefined;
  }

  const record = value as Record<string, unknown>;
  const candidate = record.id;

  if (typeof candidate === "string" && candidate.startsWith("resp_")) {
    return candidate;
  }

  for (const child of Object.values(record)) {
    const found = findResponseLikeId(child);

    if (found) {
      return found;
    }
  }

  return undefined;
}
