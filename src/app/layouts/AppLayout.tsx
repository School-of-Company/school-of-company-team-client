import type { ReactNode } from "react";
import { AppShell } from "@/widgets/app-shell";

export function AppLayout({ children }: { readonly children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
