"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/widgets/app-shell";
import { isHeadAdmin, useMe } from "@/entities/user";
import { ThemeToggle } from "@/shared/ui";
import { LogoutButton } from "@/features/auth";

export function AppLayout({ children }: { readonly children: ReactNode }) {
  const me = useMe();
  return (
    <AppShell
      isHeadAdmin={isHeadAdmin(me.data)}
      mobileUserSlot={<ThemeToggle />}
      userSlot={
        <div className="flex min-w-0 items-center gap-2 min-[60rem]:grid">
          <span className="max-w-24 truncate text-sm min-[60rem]:max-w-none">
            {me.data?.name}
          </span>
          <ThemeToggle />
          <LogoutButton />
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
