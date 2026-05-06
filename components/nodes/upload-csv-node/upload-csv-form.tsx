"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Check, Send } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/trpc/client/client";
import type { UploadedCandidateData } from "@/core/repositories/candidates-repository";

import { ColumnMappingField } from "./column-mapping-field";
import {
  REQUIRED_FIELDS,
  type ColumnMapping,
  type MappedCsvRow,
  type ParsedCsvRow,
} from "./constants";
import { createEmptyMapping, parseCsv, suggestMapping } from "./csv-utils";

const formSchema = z.object({
  vacancyText: z.string().trim().min(1, "Vacature is vereist"),
  commentText: z.string().trim().optional(),
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
  isLocked,
  onSaveAction,
  workspaceId,
  initialUploadData,
}: {
  className?: string;
  isLocked: boolean;
  onSaveAction: () => void | Promise<void>;
  workspaceId: string;
  initialUploadData: UploadedCandidateData | null;
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
      vacancyText: initialUploadData?.vacancyText ?? "",
      commentText: initialUploadData?.commentText ?? "",
      file: undefined,
    },
    mode: "onChange",
  });
  const selectedFile = useWatch({ control: form.control, name: "file" });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setParseError(null);
    setSaveError(null);

    if (!data.file) {
      setParseError("Select a CSV file before reading it.");
      return;
    }

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
  const hasSelectedFile = !!selectedFile;
  const isSubmittable = hasSelectedFile && !isSubmitting && !isLocked;
  const mappedFieldCount = REQUIRED_FIELDS.filter(
    (field) => !!mapping[field]
  ).length;
  const isSaveDisabled =
    isLocked ||
    columns.length === 0 ||
    rows.length === 0 ||
    mappedFieldCount !== REQUIRED_FIELDS.length;

  async function handleSave() {
    setSaveError(null);

    if (isLocked) {
      setSaveError(
        "This upload is locked because the next step has already processed the data."
      );
      return;
    }

    const isFormValid = await form.trigger(["vacancyText", "commentText"]);

    if (!isFormValid) {
      return;
    }

    const mappedRows: MappedCsvRow[] = rows.map((row) => ({
      linkedinUrl: row[mapping.linkedinUrl] ?? "",
      salesNavigatorId: row[mapping.salesNavigatorId] ?? "",
      firstName: row[mapping.firstName] ?? "",
      lastName: row[mapping.lastName] ?? "",
    }));

    try {
      await saveUploadedCsvRowsMutation.mutateAsync({
        workspaceId,
        vacancyText: form.getValues("vacancyText").trim(),
        commentText: form.getValues("commentText")?.trim() || undefined,
        rows: mappedRows,
      });
      await onSaveAction();
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Opslaan mislukt. Controleer je sessie en probeer het opnieuw.";

      console.error("Failed to save uploaded CSV rows", error);
      setSaveError(message);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
      <FieldSet>
        <FieldGroup>
          <Controller
            control={form.control}
            name="vacancyText"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="vacancy-text-input">Vacature</FieldLabel>
                <Textarea
                  id="vacancy-text-input"
                  className="max-h-96 min-h-40 resize-y overflow-y-auto"
                  placeholder="Plak hier de volledige vacaturetekst."
                  aria-invalid={fieldState.invalid}
                  disabled={isLocked}
                  {...field}
                />
                <FieldDescription>
                  Dit veld is verplicht en wordt opgeslagen bij deze workspace.
                </FieldDescription>
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="commentText"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="comment-text-input">
                  Opmerking{" "}
                  <span className="text-muted-foreground">(optioneel)</span>
                </FieldLabel>
                <Textarea
                  id="comment-text-input"
                  className="max-h-72 min-h-28 resize-y overflow-y-auto"
                  placeholder="Voeg eventueel context of instructies toe."
                  aria-invalid={fieldState.invalid}
                  disabled={isLocked}
                  {...field}
                />
                <FieldDescription>
                  Optioneel. Laat leeg als er geen extra commentaar nodig is.
                </FieldDescription>
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />

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
                  disabled={isLocked}
                  onChange={(event) => field.onChange(event.target.files)}
                />
                <FieldDescription>
                  Een opgeslagen CSV kan niet automatisch opnieuw in dit veld
                  worden ingevuld. Kies een nieuw bestand als je de rijen wilt
                  vervangen.
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
        {isLocked ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="size-4" />
              Upload vergrendeld
            </div>
            <p className="text-sm">
              Deze gegevens kunnen niet meer worden gewijzigd, omdat de
              volgende stap ze al heeft verwerkt.
            </p>
          </div>
        ) : null}

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
                  disabled={isLocked}
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
