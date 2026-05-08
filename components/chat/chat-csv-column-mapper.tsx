"use client";

import { FieldError, FieldGroup } from "@/components/ui/field";
import { ColumnMappingField } from "@/components/chat/column-mapping-field";
import { ColumnMapping, REQUIRED_FIELDS } from "./constants";

type ChatCsvColumnMapperProps = {
  columns: string[];
  disabled?: boolean;
  mapping: ColumnMapping;
  onChange: (nextMapping: ColumnMapping) => void;
};

export function ChatCsvColumnMapper({
  columns,
  disabled = false,
  mapping,
  onChange,
}: ChatCsvColumnMapperProps) {
  const hasMissingFields = REQUIRED_FIELDS.some((field) => !mapping[field]);

  return (
    <div className="mt-4 max-w-xl rounded-2xl border bg-muted/20 p-4">
      <FieldGroup className="gap-3">
        {REQUIRED_FIELDS.map((field) => (
          <ColumnMappingField
            key={field}
            columns={columns}
            disabled={disabled}
            field={field}
            isError={!mapping[field]}
            value={mapping[field]}
            onChange={(value) =>
              onChange({
                ...mapping,
                [field]: value,
              })
            }
          />
        ))}
      </FieldGroup>
      {hasMissingFields ? (
        <FieldError className="mt-3">
          Koppel alle verplichte kolommen om door te gaan.
        </FieldError>
      ) : null}
    </div>
  );
}