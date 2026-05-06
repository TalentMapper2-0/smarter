"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Check,
  FileUp,
  Rocket,
  Save,
  Upload,
  X,
} from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client/client";
import type { UploadedCandidateData } from "@/core/repositories/candidates-repository";

import { ColumnMappingField } from "./column-mapping-field";
import {
  FIELD_LABELS,
  REQUIRED_FIELDS,
  type ColumnMapping,
  type MappedCsvRow,
  type ParsedCsvRow,
} from "./constants";
import { createEmptyMapping, parseCsv, suggestMapping } from "./csv-utils";

const formSchema = z.object({
  vacancyText: z.string().trim().min(1, "Vacature is vereist"),
  commentText: z.string().trim().optional(),
});

const MAX_PREVIEW_ROWS = 3;

export function UploadCsvForm({
  className,
  isLocked,
  onSaveAction,
  onSaveAndClassifyAction,
  workspaceId,
  initialUploadData,
}: {
  className?: string;
  isLocked: boolean;
  onSaveAction: () => void | Promise<void>;
  onSaveAndClassifyAction?: () => void | Promise<void>;
  workspaceId: string;
  initialUploadData: UploadedCandidateData | null;
}) {
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedCsvRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(createEmptyMapping);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    },
    mode: "onChange",
  });

  // Show previously saved data on re-open
  useEffect(() => {
    if (initialUploadData && initialUploadData.rows.length > 0 && columns.length === 0) {
      const syntheticColumns = ["firstName", "lastName", "linkedinUrl", "salesNavigatorId"];
      const syntheticRows: ParsedCsvRow[] = initialUploadData.rows.map((row) => ({
        firstName: row.firstName,
        lastName: row.lastName,
        linkedinUrl: row.linkedinUrl,
        salesNavigatorId: row.salesNavigatorId,
      }));

      setColumns(syntheticColumns);
      setRows(syntheticRows);
      setMapping({
        firstName: "firstName",
        lastName: "lastName",
        linkedinUrl: "linkedinUrl",
        salesNavigatorId: "salesNavigatorId",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-parse CSV on file select
  const handleFileSelected = useCallback(async (file: File) => {
    setParseError(null);
    setFileName(file.name);

    if (
      file.type !== "text/csv" &&
      !file.name.toLowerCase().endsWith(".csv")
    ) {
      setParseError("Bestand moet een CSV zijn.");
      return;
    }

    setIsParsing(true);

    try {
      const csvText = await file.text();
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
    } catch {
      setParseError("Het CSV-bestand kon niet worden gelezen.");
    } finally {
      setIsParsing(false);
    }
  }, []);

  // Drag-and-drop handlers
  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!isLocked) {
        setIsDragOver(true);
      }
    },
    [isLocked]
  );

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);

      if (isLocked) return;

      const file = event.dataTransfer.files?.[0];
      if (file) {
        void handleFileSelected(file);
      }
    },
    [isLocked, handleFileSelected]
  );

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void handleFileSelected(file);
      }
    },
    [handleFileSelected]
  );

  function handleClearFile() {
    setFileName(null);
    setColumns([]);
    setRows([]);
    setMapping(createEmptyMapping());
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const isSaving = saveUploadedCsvRowsMutation.isPending;
  const mappedFieldCount = REQUIRED_FIELDS.filter(
    (field) => !!mapping[field]
  ).length;
  const unmappedFields = REQUIRED_FIELDS.filter((field) => !mapping[field]);
  const allFieldsMapped = mappedFieldCount === REQUIRED_FIELDS.length;
  const isSaveDisabled =
    isLocked ||
    columns.length === 0 ||
    rows.length === 0 ||
    !allFieldsMapped;

  // Build mapped preview rows
  const previewRows: MappedCsvRow[] = rows.slice(0, MAX_PREVIEW_ROWS).map((row) => ({
    linkedinUrl: row[mapping.linkedinUrl] ?? "",
    salesNavigatorId: row[mapping.salesNavigatorId] ?? "",
    firstName: row[mapping.firstName] ?? "",
    lastName: row[mapping.lastName] ?? "",
  }));

  async function handleSave(andClassify = false) {
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

      if (andClassify && onSaveAndClassifyAction) {
        await onSaveAndClassifyAction();
      } else {
        await onSaveAction();
      }
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
    <div className={className}>
      <FieldSet>
        {/* Step 1: Vacancy + comment */}
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
        </FieldGroup>

        {/* Step 2: CSV file upload */}
        {columns.length === 0 ? (
          <FieldGroup>
            <Field>
              <FieldLabel>CSV-bestand</FieldLabel>
              <div
                role="button"
                tabIndex={0}
                className={cn(
                  "relative flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
                  isDragOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
                  isLocked && "pointer-events-none opacity-50",
                  parseError && "border-destructive/50"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isLocked && fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    !isLocked && fileInputRef.current?.click();
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  id="csv-upload-input"
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  disabled={isLocked}
                  onChange={handleFileInputChange}
                />

                {isParsing ? (
                  <>
                    <Spinner className="size-6 text-primary" />
                    <p className="text-sm text-muted-foreground">
                      CSV wordt ingelezen…
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="size-6 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        Sleep een CSV hierheen
                      </p>
                      <p className="text-xs text-muted-foreground">
                        of klik om een bestand te kiezen
                      </p>
                    </div>
                  </>
                )}
              </div>
            </Field>
          </FieldGroup>
        ) : null}

        {parseError ? <FieldError>{parseError}</FieldError> : null}

        {/* Step 3: Column mapping (only after CSV is parsed) */}
        {columns.length > 0 ? (
          <FieldGroup>
            <div className="relative rounded-lg border bg-muted/30 px-3 py-2.5">
              <div className="flex items-center gap-2 pr-6 text-sm font-medium">
                <Check className="size-4 text-primary" />
                CSV ingelezen {fileName ? `(${fileName})` : ""}
              </div>
              <p className="text-sm text-muted-foreground">
                {rows.length} rijen gevonden, {columns.length} kolommen
                beschikbaar.
              </p>
              {!isLocked ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="absolute right-1 top-1 h-7 w-7 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleClearFile}
                >
                  <X className="size-4" />
                  <span className="sr-only">Bestand verwijderen</span>
                </Button>
              ) : null}
            </div>

            <FieldGroup className="gap-3">
              {REQUIRED_FIELDS.map((field) => (
                <ColumnMappingField
                  key={field}
                  field={field}
                  columns={columns}
                  disabled={isLocked}
                  isError={!mapping[field]}
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

            {/* Mapped data preview table */}
            {allFieldsMapped && previewRows.length > 0 ? (
              <div className="overflow-hidden rounded-lg border">
                <div className="bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
                  Voorbeeld van gekoppelde gegevens (eerste {previewRows.length}{" "}
                  rijen)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/10">
                        <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                          Voornaam
                        </th>
                        <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                          Achternaam
                        </th>
                        <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                          LinkedIn URL
                        </th>
                        <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                          Sales Navigator ID
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, index) => (
                        <tr
                          key={index}
                          className="border-b last:border-b-0 even:bg-muted/5"
                        >
                          <td className="px-3 py-1.5">{row.firstName || "—"}</td>
                          <td className="px-3 py-1.5">{row.lastName || "—"}</td>
                          <td className="max-w-48 truncate px-3 py-1.5 text-muted-foreground">
                            {row.linkedinUrl || "—"}
                          </td>
                          <td className="max-w-32 truncate px-3 py-1.5 text-muted-foreground">
                            {row.salesNavigatorId || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length > MAX_PREVIEW_ROWS ? (
                  <div className="border-t bg-muted/10 px-3 py-1.5 text-xs text-muted-foreground">
                    + {rows.length - MAX_PREVIEW_ROWS} meer rijen
                  </div>
                ) : null}
              </div>
            ) : null}
          </FieldGroup>
        ) : null}

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

        {/* Step 4: Save actions */}
        {columns.length > 0 ? (
          <div className="flex flex-col gap-3 rounded-lg border px-3 py-2.5">
            <div className="text-sm text-muted-foreground">
              {allFieldsMapped ? (
                <span className="text-primary">
                  Alle velden gekoppeld ✓
                </span>
              ) : (
                <span>
                  {mappedFieldCount} van {REQUIRED_FIELDS.length} velden
                  gekoppeld
                  {unmappedFields.length > 0 ? (
                    <span className="text-destructive">
                      {" "}
                      — ontbreekt:{" "}
                      {unmappedFields
                        .map((f) => FIELD_LABELS[f])
                        .join(", ")}
                    </span>
                  ) : null}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {onSaveAndClassifyAction ? (
                <Button
                  type="button"
                  onClick={() => void handleSave(true)}
                  disabled={isSaveDisabled || isSaving}
                  className="w-full"
                >
                  <Rocket className="size-4" />
                  Opslaan & classificeren
                  {isSaving ? <Spinner /> : null}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSave(false)}
                disabled={isSaveDisabled || isSaving}
                className="w-full"
              >
                <Save className="size-4" />
                Opslaan
                {isSaving ? <Spinner /> : null}
              </Button>
            </div>
          </div>
        ) : null}
      </FieldSet>
    </div>
  );
}
