"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { projectQueries } from "@/entities/project";
import { useMe, userDestination } from "@/entities/user";
import { isSearchShortcut, SearchPalette } from "@/features/global-search";
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
import { headingAnnouncement, shouldFocusMain } from "../model/route-focus";

const noSubscribe = () => () => {};
/** 단축키 표시. 서버 렌더에서는 비워 두고(수화 불일치 방지) 브라우저에서 플랫폼에 맞춘다. */
function useShortcutLabel() {
  return useSyncExternalStore(
    noSubscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K"),
    () => "",
  );
}

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
  const main = useRef<HTMLElement>(null);
  const [announcement, setAnnouncement] = useState("");
  const shownPath = useRef(pathname);
  // 화면 이동(링크·router.push·뒤로가기) 뒤 포커스를 본문으로 옮기고 새 화면 제목을 알린다.
  // 쿼리만 바뀌는 탭·필터·업무 패널(`?tab=`, `?task=`)은 같은 화면이라 건드리지 않는다.
  // 스크롤은 Next.js 가 정한다(새 화면은 맨 위, 뒤로가기는 이전 위치). preventScroll 로 그대로 둔다.
  useEffect(() => {
    if (shownPath.current === pathname) return;
    shownPath.current = pathname;
    const region = main.current;
    if (!region) return;
    if (shouldFocusMain(document.activeElement, region, document.body))
      region.focus({ preventScroll: true });
    setAnnouncement("");
    // 이동 직후에는 이전 화면이 잠시 남아 있을 수 있다(새 화면이 준비될 때까지).
    // 그래서 h1 이 새 요소로 바뀌면 바로 알리고, 1초 안에 바뀌지 않으면 지금 h1 을 새 화면 제목으로 본다.
    // 데이터를 불러온 뒤에 제목이 생기는 화면도 있어 최대 5초 지켜본다.
    const start = region.querySelector("h1");
    const announce = (heading: Element | null) => {
      const text = headingAnnouncement(heading?.textContent);
      if (text) setAnnouncement(text);
      return !!text;
    };
    const observer = new MutationObserver(() => {
      const heading = region.querySelector("h1");
      if (heading !== start && announce(heading)) observer.disconnect();
    });
    observer.observe(region, { childList: true, subtree: true });
    const settle = window.setTimeout(() => {
      const heading = region.querySelector("h1");
      if (heading === start) announce(heading);
    }, 1000);
    const stop = window.setTimeout(() => observer.disconnect(), 5000);
    return () => {
      observer.disconnect();
      window.clearTimeout(settle);
      window.clearTimeout(stop);
    };
  }, [pathname]);
  const me = useMe();
  // 검색·프로젝트 목록은 업무를 쓸 수 있는 사용자(승인·Discord 연결 완료)에게만.
  const working = me.data !== undefined && userDestination(me.data) === "/";
  const projects = useQuery({
    ...projectQueries.list(),
    enabled: working,
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const shortcut = useShortcutLabel();
  useEffect(() => {
    if (!working) return;
    const onKey = (event: KeyboardEvent) => {
      if (!isSearchShortcut(event)) return;
      event.preventDefault();
      setMenuOpen(false);
      setSearchOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [working]);
  const searchButton = working && (
    <button
      type="button"
      className="app-search-button"
      aria-haspopup="dialog"
      aria-keyshortcuts="Meta+K Control+K"
      onClick={() => {
        setMenuOpen(false);
        setSearchOpen(true);
      }}
    >
      <Icon name="search" className="shrink-0" />
      <span>검색</span>
      {shortcut && <kbd>{shortcut}</kbd>}
    </button>
  );
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
    { href: routes.services, label: "서비스", icon: "service" },
    { href: routes.incidents, label: "사고", icon: "alert" },
    { href: routes.docs, label: "문서", icon: "doc" },
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
        {searchButton}
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
          <div className="ml-auto flex min-w-0 items-center gap-2">
            {working && (
              <IconButton
                aria-label="검색"
                aria-haspopup="dialog"
                variant="ghost"
                onClick={() => setSearchOpen(true)}
              >
                <Icon name="search" />
              </IconButton>
            )}
            {mobileUserSlot}
          </div>
        </header>
        <main
          ref={main}
          id="main-content"
          tabIndex={-1}
          className="app-main mx-auto w-full max-w-[90rem] min-w-0 p-4 outline-none min-[60rem]:p-[var(--page-inset)]"
        >
          {children}
        </main>
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>
      <Dialog
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="School of Company"
        className="ui-drawer"
      >
        {searchButton}
        {navigation}
        {projectNavigation}
        {accountNavigation}
        <div className="mt-6 border-t border-border pt-4">{userSlot}</div>
      </Dialog>
      {working && (
        <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      )}
    </div>
  );
}
