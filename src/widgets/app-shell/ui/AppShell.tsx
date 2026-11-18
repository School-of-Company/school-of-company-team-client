"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { routes } from "@/shared/config";
import { Dialog, IconButton } from "@/shared/ui";

export type AppShellProps = {
  readonly children: ReactNode;
  readonly userSlot?: ReactNode;
  readonly isHeadAdmin?: boolean;
};

export function AppShell({
  children,
  userSlot,
  isHeadAdmin = false,
}: AppShellProps) {
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    { href: routes.me, label: "내 보드", icon: "▦" },
    { href: routes.team, label: "팀 공용", icon: "◎" },
    { href: routes.projects, label: "프로젝트", icon: "▤" },
    ...(isHeadAdmin
      ? [{ href: routes.admin, label: "관리자", icon: "⚙" }]
      : []),
    { href: routes.account, label: "내 계정", icon: "○" },
  ];
  const navigation = (
    <nav aria-label="주 메뉴" className="grid gap-1">
      {links.map(({ href, label, icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
            className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium ${active ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-hover hover:text-foreground"}`}
          >
            <span className="w-5 text-center" aria-hidden="true">
              {icon}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-surface focus:p-3"
      >
        본문으로 건너뛰기
      </a>
      <aside className="hidden border-r border-border bg-surface p-5 md:flex md:flex-col">
        <Link
          href={routes.me}
          className="mb-10 px-3 text-lg font-bold tracking-tight"
        >
          Engineering Hub
        </Link>
        {navigation}
        <div className="mt-auto border-t border-border pt-5">
          {userSlot ?? (
            <p className="px-3 text-xs text-muted">School of Company</p>
          )}
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex min-h-16 items-center gap-3 border-b border-border bg-surface px-4 md:px-8">
          <IconButton
            aria-label="메뉴 열기"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            variant="ghost"
            className="md:hidden"
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </IconButton>
          <span className="text-sm font-medium">
            {links.find(
              (link) =>
                pathname === link.href || pathname.startsWith(`${link.href}/`),
            )?.label ?? "Engineering Hub"}
          </span>
          <div className="ml-auto md:hidden">{userSlot}</div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 p-4 outline-none md:p-8"
        >
          {children}
        </main>
      </div>
      <Dialog
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Engineering Hub"
        className="ui-drawer"
      >
        {navigation}
      </Dialog>
    </div>
  );
}
