import { Spinner } from "@/components/ui/spinner";

export function WorkspaceFlowLoader() {
  return (
    <div className="flex h-[calc(100svh-4.0625rem)] min-h-140 w-full flex-1 items-center justify-center">
      <Spinner className="size-8" />
    </div>
  );
}
