import { ChatComposer } from "../chat-composer";

export function DisabledChatComposer({
  placeholder = "Type hier...",
}: {
  placeholder?: string;
}) {
  return (
    <ChatComposer
      disabled
      isSubmitting
      placeholder={placeholder}
      allowAttachments={false}
      onSubmitAction={() => {
        // Intentionally empty.
      }}
    />
  );
}