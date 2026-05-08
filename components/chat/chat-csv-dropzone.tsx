"use client";

import { useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";

import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type ChatSelectedCsvFile = {
  name: string;
  size: number;
};

type ChatCsvDropzoneProps = {
  disabled?: boolean;
  isUploading?: boolean;
  onCsvSelectedAction?: (file: File) => void | Promise<void>;
  selectedFile?: ChatSelectedCsvFile | null;
};

export function ChatCsvDropzone({
  disabled = false,
  isUploading = false,
  onCsvSelectedAction: onCsvSelected,
  selectedFile = null,
}: ChatCsvDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (file: File) => {
    setError(null);

    if (file.type !== "text/csv" && !file.name.toLowerCase().endsWith(".csv")) {
      setError("Bestand moet een CSV zijn.");
      return;
    }

    try {
      await onCsvSelected?.(file);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Het CSV-bestand kon niet worden verwerkt."
      );
    }
  };

  if (selectedFile) {
    return (
      <div className="mt-4 max-w-xl">
        <div className="flex items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3 border">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background">
            <FileText className="size-4 text-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {selectedFile.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 max-w-xl">
      <div
        role="button"
        tabIndex={disabled || isUploading ? -1 : 0}
        className={cn(
          "relative flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
          (disabled || isUploading) && "pointer-events-none opacity-50",
          error && "border-destructive/50"
        )}
        onClick={() => {
          if (!disabled && !isUploading) {
            fileInputRef.current?.click();
          }
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragOver(false);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragOver(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragOver(false);

          const file = event.dataTransfer.files?.[0];

          if (file) {
            void handleFileSelected(file);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();

            if (!disabled && !isUploading) {
              fileInputRef.current?.click();
            }
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          disabled={disabled || isUploading}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];

            if (file) {
              void handleFileSelected(file);
            }

            event.currentTarget.value = "";
          }}
        />

        {isUploading ? (
          <>
            <Spinner className="size-6 text-primary" />
            <p className="text-sm text-muted-foreground">
              CSV wordt verwerkt...
            </p>
          </>
        ) : (
          <>
            <Upload className="size-6 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Sleep een CSV hierheen</p>
              <p className="text-xs text-muted-foreground">
                of klik om een bestand te kiezen
              </p>
            </div>
          </>
        )}
      </div>

      {error ? <FieldError className="mt-2">{error}</FieldError> : null}
    </div>
  );
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}
