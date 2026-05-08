import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { useId } from "react";
import { FIELD_LABELS, RequiredField } from "./constants";

export function ColumnMappingField({
  columns,
  disabled = false,
  field,
  isError = false,
  onChange,
  value,
}: {
  columns: string[];
  disabled?: boolean;
  field: RequiredField;
  isError?: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  const inputId = useId();

  return (
    <Field>
      <FieldLabel
        htmlFor={inputId}
        className={cn(isError && "text-destructive")}
      >
        {FIELD_LABELS[field]}
        {isError ? " *" : ""}
      </FieldLabel>
      <Select
        disabled={disabled}
        value={value || "__none__"}
        onValueChange={(nextValue) =>
          onChange(nextValue === "__none__" ? "" : nextValue)
        }
      >
        <SelectTrigger
          id={inputId}
          className={cn("w-full", isError && "border-destructive ring-destructive/30 ring-1")}
          size="sm"
        >
          <SelectValue placeholder="Niet gekoppeld" />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectGroup>
            <SelectItem value="__none__">Niet gekoppeld</SelectItem>
            {columns.map((column) => (
              <SelectItem key={column} value={column}>
                {column}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}