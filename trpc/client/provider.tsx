"use client";

import { ReactNode, useState } from "react";
import { trpc } from "./client";
import { QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { getQueryClient } from "./query-client";
import { transformer } from "./transformer";

export function TRPCProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
