import AzureLoginButton from "@/components/azure-login-button";
import { BrainCircuit } from "lucide-react";

export default function Page() {
  return (
    <main className="flex h-screen items-center justify-center">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <a
              href="#"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-primary">
                <BrainCircuit className="size-8 text-white" />
              </div>
              <span className="sr-only">Smarter.</span>
            </a>
            <h1 className="text-xl font-bold">Welkom bij Smarter</h1>
          </div>
          <div className="flex flex-col gap-6">
            <AzureLoginButton />
          </div>
        </div>
        <div className="text-center text-xs text-balance text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
          Disclaimer: Smarter is nog in ontwikkeling en kan nog bugs bevatten.
        </div>
      </div>
    </main>
  );
}
