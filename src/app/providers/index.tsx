"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ToastProvider } from "@/shared/ui";
import { createQueryClient } from "./query-client";
import { IdentityProvider } from "@/features/auth";

export { AppearanceBootScript } from "./AppearanceBootScript";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <IdentityProvider>{children}</IdentityProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
