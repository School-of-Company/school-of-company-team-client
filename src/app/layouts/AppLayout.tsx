"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/widgets/app-shell";
import { isHeadAdmin, useMe } from "@/entities/user";
import { AuthGuard, LogoutButton } from "@/features/auth";

export function AppLayout({ children }: { readonly children: ReactNode }) {
  const me = useMe();
  return (
    <AuthGuard>
      <AppShell
        isHeadAdmin={isHeadAdmin(me.data)}
        userSlot={
          <div className="grid min-w-0 gap-2">
            <span className="truncate text-sm">{me.data?.name}</span>
            <LogoutButton />
          </div>
        }
      >
        {children}
      </AppShell>
    </AuthGuard>
  );
}
