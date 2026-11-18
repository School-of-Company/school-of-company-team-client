"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/widgets/app-shell";
import { isHeadAdmin, useMe, userAvatarUrl } from "@/entities/user";
import { Avatar } from "@/shared/ui";
import { LogoutButton } from "@/features/auth";

export function AppLayout({ children }: { readonly children: ReactNode }) {
  const me = useMe();
  return (
    <AppShell
      isHeadAdmin={isHeadAdmin(me.data)}
      userSlot={
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            {me.data && (
              <Avatar name={me.data.name} src={userAvatarUrl(me.data)} />
            )}
            <span className="min-w-0 truncate text-sm font-medium">
              {me.data?.name}
            </span>
          </span>
          <LogoutButton appearance="link" />
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
