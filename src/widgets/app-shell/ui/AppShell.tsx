"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { projectQueries } from "@/entities/project";
import { useMe, userDestination } from "@/entities/user";
import { routes } from "@/shared/config";
import {
  BrandMark,
  Button,
  Dialog,
  IconButton,
  Icon,
  Skeleton,
  type IconName,
} from "@/shared/ui";

export type AppShellProps = {
  readonly children: ReactNode;
  readonly userSlot?: ReactNode;
  readonly mobileUserSlot?: ReactNode;
  readonly isHeadAdmin?: boolean;
};

export function AppShell({
  children,
  userSlot,
  mobileUserSlot,
  isHeadAdmin = false,
}: AppShellProps) {
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const me = useMe();
  const projects = useQuery({
    ...projectQueries.list(),
    enabled: me.data !== undefined && userDestination(me.data) === "/",
  });
  const activeProjects =
    projects.data?.filter((project) => !project.archived) ?? [];
  type NavLink = {
    readonly href: string;
    readonly label: string;
    readonly icon: IconName;
  };
  // 순서와 그룹은 docs/ia.md "완성 후 사이드바"를 따른다. 관리자·설정은 맨 아래.
  const workLinks: readonly NavLink[] = [
    { href: routes.home, label: "홈", icon: "home" },
    { href: routes.me, label: "내 보드", icon: "board" },
    { href: routes.team, label: "팀 공용", icon: "team" },
    { href: routes.projects, label: "프로젝트", icon: "project" },
  ];
  const orgLinks: readonly NavLink[] = [
    { href: routes.members, label: "팀원", icon: "user" },
  ];
  const accountLinks: readonly NavLink[] = [
    ...(isHeadAdmin
      ? [{ href: routes.admin, label: "관리자", icon: "shield" } as const]
      : []),
    { href: routes.account, label: "설정", icon: "settings" },
  ];
  const navLinks = (links: readonly NavLink[]) =>
    links.map(({ href, label, icon }) => {
      const active =
        pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
      return (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          onClick={() => setMenuOpen(false)}
          className="ui-nav-link flex items-center"
        >
          <Icon name={icon} className="shrink-0" />
          {label}
        </Link>
      );
    });
  const navigation = (
    <>
      <nav aria-label="주 메뉴" className="grid">
        <h2>내 일</h2>
        {navLinks(workLinks)}
      </nav>
      <nav aria-label="조직" className="grid">
        <h2>조직</h2>
        {navLinks(orgLinks)}
      </nav>
    </>
  );
  const accountNavigation = (
    <nav aria-label="관리" className="grid">
      {navLinks(accountLinks)}
    </nav>
  );
  const projectNavigation = (
    <nav aria-label="프로젝트 바로가기" className="grid">
      <h2>프로젝트</h2>
      {projects.isPending ? (
        <div
          role="status"
          aria-label="프로젝트 불러오는 중"
          className="grid gap-2 px-3"
        >
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
      ) : projects.isError ? (
        <div role="alert" className="grid gap-2 px-3 text-sm">
          <p className="text-danger">프로젝트를 불러오지 못했습니다.</p>
          <Button variant="secondary" onClick={() => void projects.refetch()}>
            다시 시도
          </Button>
        </div>
      ) : activeProjects.length === 0 ? (
        <p className="px-3 text-sm text-muted">표시할 프로젝트가 없습니다.</p>
      ) : (
        activeProjects.map((project) => {
          const href = routes.project(project.id);
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={project.id}
              href={href}
              aria-current={active ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
              className="ui-nav-link flex min-w-0 items-center"
            >
              <span className="truncate" title={project.key}>
                {project.name}
              </span>
            </Link>
          );
        })
      )}
    </nav>
  );
  return (
    <div className="app-shell min-h-dvh min-[60rem]:grid min-[60rem]:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-surface focus:p-3"
      >
        본문으로 건너뛰기
      </a>
      <aside className="app-sidebar sticky top-0 hidden h-dvh min-w-0 overflow-y-auto border-r border-border p-3 min-[60rem]:flex min-[60rem]:flex-col">
        <Link
          href={routes.home}
          className="flex min-w-0 items-center gap-2 text-sm font-semibold"
        >
          <BrandMark size={28} label />
        </Link>
        {navigation}
        {projectNavigation}
        <div className="mt-auto pt-5">{accountNavigation}</div>
        <div className="border-t border-border pt-5">
          {userSlot ?? (
            <p className="px-3 text-xs text-muted">School of Company</p>
          )}
        </div>
      </aside>
      <div className="min-w-0">
        <header className="app-topbar flex min-h-16 items-center gap-3 border-b border-border px-4 min-[60rem]:hidden">
          <IconButton
            aria-label="메뉴 열기"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            variant="ghost"
            className="min-[60rem]:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <Icon name="menu" />
          </IconButton>
          <Link
            href={routes.home}
            className="shrink-0 min-[60rem]:hidden"
            aria-label="School of Company 홈"
          >
            <BrandMark size={24} label />
          </Link>
          <div className="ml-auto min-w-0">{mobileUserSlot}</div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="app-main mx-auto w-full max-w-[90rem] min-w-0 p-4 outline-none min-[60rem]:p-[var(--page-inset)]"
        >
          {children}
        </main>
      </div>
      <Dialog
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="School of Company"
        className="ui-drawer"
      >
        {navigation}
        {projectNavigation}
        {accountNavigation}
        <div className="mt-6 border-t border-border pt-4">{userSlot}</div>
      </Dialog>
    </div>
  );
}
