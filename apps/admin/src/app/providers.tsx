"use client";

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { theme } from "@/lib/theme";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }),
  );

  // Na razie tylko jasny motyw; ciemny jest przygotowany w motywie i wróci z przełącznikiem w menu konta.
  return (
    <MantineProvider theme={theme} forceColorScheme="light">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MantineProvider>
  );
}
