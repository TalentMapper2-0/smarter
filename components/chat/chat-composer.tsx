"use client";

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";

type ChatComposerProps = {
  disabled?: boolean;
  isSubmitting?: boolean;
  placeholder?: string;
  onSubmit: (message: string) => void | Promise<void>;
};

export function ChatComposer({
  disabled = false,
  isSubmitting = false,
  placeholder = "Stuur een bericht",
  onSubmit,
}: ChatComposerProps) {
  return (
    <PromptInput
      className="mx-auto w-full max-w-3xl"
      onSubmit={async ({ text }) => {
        const message = text.trim();

        if (!message || disabled) {
          return;
        }

        await onSubmit(message);
      }}
    >
      <PromptInputBody>
        <PromptInputTextarea
          disabled={disabled || isSubmitting}
          placeholder={placeholder}
        />
      </PromptInputBody>
      <PromptInputFooter>
        <div />
        <PromptInputSubmit disabled={disabled || isSubmitting} />
      </PromptInputFooter>
    </PromptInput>
  );
}
