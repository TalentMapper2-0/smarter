"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Send } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import z from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/trpc/client/client";

import { ColumnMappingField } from "./column-mapping-field";
import {
  REQUIRED_FIELDS,
  type ColumnMapping,
  type MappedCsvRow,
  type ParsedCsvRow,
} from "./constants";
import { createEmptyMapping, parseCsv, suggestMapping } from "./csv-utils";

const formSchema = z.object({
  file: z
    .unknown()
    .transform((value) => {
      if (typeof FileList !== "undefined" && value instanceof FileList) {
        return value.item(0) ?? undefined;
      }

      if (typeof File !== "undefined" && value instanceof File) {
        return value;
      }

      return undefined;
    })
    .refine((file) => !!file, { message: "Bestand is vereist" })
    .refine(
      (file) =>
        !file ||
        file.type === "text/csv" ||
        file.name.toLowerCase().endsWith(".csv"),
      { message: "Bestand moet een CSV zijn" }
    ),
});

export function UploadCsvForm({
  className,
  onSaveAction,
}: {
  className?: string;
  onSaveAction: () => void;
}) {
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedCsvRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(createEmptyMapping);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveUploadedCsvRowsMutation = trpc.candidates.create.useMutation();
  const form = useForm<
    z.input<typeof formSchema>,
    undefined,
    z.output<typeof formSchema>
  >({
    resolver: zodResolver(formSchema),
    defaultValues: {
      file: undefined,
    },
    mode: "onChange",
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setParseError(null);
    setSaveError(null);

    const csvText = await data.file.text();
    const parsedCsv = parseCsv(csvText);

    if (!parsedCsv.columns.length || !parsedCsv.rows.length) {
      setColumns([]);
      setRows([]);
      setMapping(createEmptyMapping());
      setParseError(
        "We konden geen bruikbare rijen vinden. Controleer of de CSV een header en minstens 1 rij bevat."
      );
      return;
    }

    setColumns(parsedCsv.columns);
    setRows(parsedCsv.rows);
    setMapping(suggestMapping(parsedCsv.columns));
  }

  const isSubmitting = form.formState.isSubmitting;
  const isSaving = saveUploadedCsvRowsMutation.isPending;
  const isSubmittable = form.formState.isValid && !isSubmitting;
  const mappedFieldCount = REQUIRED_FIELDS.filter(
    (field) => !!mapping[field]
  ).length;
  const isSaveDisabled =
    columns.length === 0 || mappedFieldCount !== REQUIRED_FIELDS.length;

  async function handleSave() {
    setSaveError(null);

    const mappedRows: MappedCsvRow[] = rows.map((row) => ({
      linkedinUrl: row[mapping.linkedinUrl] ?? "",
      salesNavigatorId: row[mapping.salesNavigatorId] ?? "",
      firstName: row[mapping.firstName] ?? "",
      lastName: row[mapping.lastName] ?? "",
    }));

    try {
      await saveUploadedCsvRowsMutation.mutateAsync(mappedRows);
      onSaveAction();
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Opslaan mislukt. Controleer je sessie en probeer het opnieuw.";

      console.error("Failed to save uploaded CSV rows", error);
      setSaveError(
        message
      );
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
      <FieldSet>
        <FieldGroup>
          <Controller
            control={form.control}
            name="file"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="csv-upload-input">CSV-bestand</FieldLabel>
                <Input
                  id="csv-upload-input"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => field.onChange(event.target.files)}
                />
                <FieldDescription>
                  Na het uploaden kun je kolommen koppelen aan de velden die we
                  nodig hebben.
                </FieldDescription>
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
          <Field className="flex justify-end" orientation="horizontal">
            <Button type="submit" disabled={!isSubmittable}>
              CSV inlezen
              {isSubmitting ? <Spinner /> : <Send />}
            </Button>
          </Field>
        </FieldGroup>

        {parseError ? <FieldError>{parseError}</FieldError> : null}
        {saveError ? <FieldError>{saveError}</FieldError> : null}

        {columns.length > 0 ? (
          <FieldGroup>
            <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Check className="size-4 text-primary" />
                CSV ingelezen
              </div>
              <p className="text-sm text-muted-foreground">
                {rows.length} rijen gevonden, {columns.length} kolommen
                beschikbaar.
              </p>
            </div>

            <FieldGroup className="gap-3 md:grid md:grid-cols-2">
              {REQUIRED_FIELDS.map((field) => (
                <ColumnMappingField
                  key={field}
                  field={field}
                  columns={columns}
                  value={mapping[field]}
                  onChange={(value) =>
                    setMapping((currentMapping) => ({
                      ...currentMapping,
                      [field]: value,
                    }))
                  }
                />
              ))}
            </FieldGroup>

            <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
              <p className="text-sm text-muted-foreground">
                {mappedFieldCount} van {REQUIRED_FIELDS.length} velden gekoppeld
              </p>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaveDisabled || isSaving}
              >
                Opslaan
                {isSaving ? <Spinner /> : null}
              </Button>
            </div>
          </FieldGroup>
        ) : null}
      </FieldSet>
    </form>
  );
}
