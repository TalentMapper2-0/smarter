"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Bot, CornerDownLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { trpc } from "@/trpc/client/client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "../ui/input-group";

const formSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Titel moet minstens 2 tekens bevatten.")
    .max(20, "Titel mag maximaal 20 tekens bevatten."),
});

const CREATE_CHAT_ERROR_MESSAGE =
  "Er is een fout opgetreden bij het aanmaken van de chat. Probeer het opnieuw.";

export default function ChatWelcomeManager({ error }: { error?: string }) {
  const router = useRouter();
  const [isServerErrorDismissed, setIsServerErrorDismissed] = useState(false);
  const form = useForm<
    z.input<typeof formSchema>,
    undefined,
    z.output<typeof formSchema>
  >({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
    },
    mode: "onSubmit",
  });

  const createChat = trpc.chat.create.useMutation();

  const titleError = form.formState.errors.title;
  const serverError =
    error === "chat-create" && !isServerErrorDismissed
      ? CREATE_CHAT_ERROR_MESSAGE
      : null;

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsServerErrorDismissed(true);

    try {
      const chat = await createChat.mutateAsync({ title: values.title });

      form.reset();
      router.push(`/c/${chat.id}`);
    } catch {
      setIsServerErrorDismissed(false);
      router.replace("/c?error=chat-create");
    }
  });

  return (
    <form className="w-full flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="text-center">
        <h1 className="text-xl">Welkom bij Smarter!</h1>
        <p className="text-muted-foreground">
          Geef je chat een titel en start een gesprek.
        </p>
      </div>
      <FieldGroup>
        <Field data-invalid={titleError ? true : undefined}>
          <FieldLabel htmlFor="chat-title" className="sr-only">
            Chat titel
          </FieldLabel>
          <InputGroup className="h-10 bg-sidebar [--radius:9999px]">
            <InputGroupAddon>
              <Bot />
            </InputGroupAddon>
            <InputGroupInput
              id="chat-title"
              placeholder="Developer"
              autoComplete="off"
              aria-invalid={titleError ? true : undefined}
              {...form.register("title", {
                onChange: () => setIsServerErrorDismissed(true),
              })}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="submit"
                size="icon-sm"
                disabled={createChat.isPending}
              >
                <CornerDownLeft />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <FieldError
            className="text-center"
            errors={titleError ? [titleError] : undefined}
          />
          {serverError ? (
            <FieldError className="text-center">{serverError}</FieldError>
          ) : null}
        </Field>
      </FieldGroup>
    </form>
  );
}
