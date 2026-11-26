"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { projectQueries } from "@/entities/project";
import { SidebarGroup } from "./SidebarGroup";
import { ProjectShortcuts } from "./ProjectShortcuts";
import { useMe, userDestination } from "@/entities/user";
import { isSearchShortcut } from "../model/search";
import { SearchPalette } from "./SearchPalette";
import { isSidebarShortcut } from "../model/sidebar";
import { routes } from "@/shared/config";
import {
  BrandMark,
  Button,
  Dialog,
  IconButton,
  Icon,
  restoreFocus,
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
  /** `undefined`는 아직 모름(내 정보 조회 중): 토큰의 역할로 첫 그림에 자리를 잡는다(`sessionRoleBootScript`). */
  readonly isHeadAdmin?: boolean;
};

export function AppShell({
  children,
  userSlot,
  mobileUserSlot,
  isHeadAdmin,
}: AppShellProps) {
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const storedCollapsed = useSyncExternalStore(
    noSubscribe,
    () => {
      try {
        return localStorage.getItem("soc.sidebar.collapsed") === "true";
      } catch {
        return false;
      }
    },
    () => false,
  );
  const [collapsedOverride, setCollapsed] = useState<boolean | null>(null);
  const collapsed = collapsedOverride ?? storedCollapsed;
  const [peeking, setPeeking] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboardPeek = useRef(false);
  const cancelHover = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  };
  // 포인터는 늦게 열고(지나가는 포인터에 깜빡이지 않게) 더 늦게 닫는다. 키보드와 Esc 는 바로 바꾼다.
  const peekAfter = (next: boolean, ms: number) => {
    cancelHover();
    hoverTimer.current = setTimeout(() => {
      hoverTimer.current = null;
      if (next) keyboardPeek.current = false;
      setPeeking(next);
    }, ms);
  };
  const peekNow = (next: boolean) => {
    cancelHover();
    setPeeking(next);
  };
  useEffect(
    () => () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    },
    [],
  );
  const sidebar = useRef<HTMLElement>(null);
  const toggleSidebar = useCallback(() => {
    setCollapsed(!collapsed);
    document.documentElement.dataset.sidebarCollapsed = String(!collapsed);
    try {
      localStorage.setItem("soc.sidebar.collapsed", String(!collapsed));
    } catch {
      // Storage may be blocked; keep the current in-memory preference.
    }
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setPeeking(false);
    if (!collapsed) requestAnimationFrame(() => main.current?.focus());
  }, [collapsed]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isSidebarShortcut(event)) {
        event.preventDefault();
        toggleSidebar();
      }
      if (event.key === "Escape" && collapsed) {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        setPeeking(false);
        if (
          sidebar.current?.contains(document.activeElement) ||
          document.activeElement?.id === "sidebar-reveal"
        )
          main.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapsed, toggleSidebar]);
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
  const searchOpener = useRef<HTMLElement | null>(null);
  const searchFromSidebar = useRef(false);
  const openSearch = useCallback(() => {
    if (searchOpen) return;
    const active = document.activeElement;
    searchOpener.current = active instanceof HTMLElement ? active : null;
    searchFromSidebar.current = sidebar.current?.contains(active) ?? false;
    setMenuOpen(false);
    setSearchOpen(true);
  }, [searchOpen]);
  const shortcut = useShortcutLabel();
  useEffect(() => {
    if (!working) return;
    const onKey = (event: KeyboardEvent) => {
      if (!isSearchShortcut(event)) return;
      event.preventDefault();
      openSearch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [working, openSearch]);
  // 계정 확인 중에도 같은 자리에 검색 버튼을 그려 둔다(확인 뒤 버튼이 끼어 메뉴 전체가 밀리지 않게).
  const searchButton = (working || me.isPending) && (
    <button
      type="button"
      className="app-search-button"
      disabled={!working}
      aria-haspopup="dialog"
      aria-keyshortcuts="Meta+K Control+K"
      onClick={openSearch}
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
    /** Other paths that belong to the same entry (내 업무 목록 / 보드, 운영 아래 상세). */
    readonly also?: readonly string[];
    /** 내 정보가 오기 전 토큰 역할로만 보이는 항목(CSS가 html[data-session-role]로 보이고 숨긴다). */
    readonly provisional?: boolean;
  };
  // 순서와 그룹은 AGENTS.md의 정보 구조 규칙을 따른다. 관리자·설정은 맨 아래.
  const workLinks: readonly NavLink[] = [
    { href: routes.home, label: "내 업무", icon: "home", also: [routes.me] },
    { href: routes.team, label: "팀 공용", icon: "team" },
    { href: routes.projects, label: "프로젝트", icon: "project" },
    { href: routes.calendar, label: "달력", icon: "calendar" },
    { href: routes.labs, label: "실험실", icon: "flask" },
    { href: routes.whiteboards, label: "화이트보드", icon: "pen" },
  ];
  const orgLinks: readonly NavLink[] = [
    { href: routes.members, label: "팀원", icon: "user" },
    // 서비스와 장애 상세는 주소가 그대로라 운영 항목으로 묶는다.
    {
      href: routes.ops,
      label: "운영",
      icon: "service",
      also: ["/services", "/incidents"],
    },
    { href: routes.requirements, label: "요구사항", icon: "inbox" },
    { href: routes.docs, label: "문서", icon: "doc" },
    { href: routes.stats, label: "통계", icon: "chart" },
  ];
  const teamLinks: readonly NavLink[] = [
    { href: routes.culture, label: "팀 문화", icon: "heart" },
    { href: routes.guide, label: "사용법", icon: "help" },
  ];
  const accountLinks: readonly NavLink[] = [
    ...(isHeadAdmin !== false
      ? [
          {
            href: routes.admin,
            label: "관리자",
            icon: "shield",
            provisional: isHeadAdmin === undefined,
          } as const,
        ]
      : []),
    { href: routes.account, label: "설정", icon: "settings" },
  ];
  const navLinks = (links: readonly NavLink[]) =>
    links.map(({ href, label, icon, also, provisional }) => {
      const active =
        pathname === href ||
        (href !== "/" && pathname.startsWith(`${href}/`)) ||
        (also ?? []).some(
          (path) => pathname === path || pathname.startsWith(`${path}/`),
        );
      return (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          onClick={() => setMenuOpen(false)}
          className="ui-nav-link flex items-center"
          data-provisional={provisional || undefined}
        >
          <Icon name={icon} className="shrink-0" />
          {label}
        </Link>
      );
    });
  const navigation = (
    <>
      <SidebarGroup title="내 일" group="work">
        {navLinks(workLinks)}
      </SidebarGroup>
      <SidebarGroup title="조직" group="org">
        {navLinks(orgLinks)}
      </SidebarGroup>
    </>
  );
  const accountNavigation = (
    <SidebarGroup title="안내와 설정" group="account">
      {navLinks(teamLinks)}
      {navLinks(accountLinks)}
    </SidebarGroup>
  );
  const projectNavigation = (
    <SidebarGroup title="프로젝트" group="projects">
      {projects.isPending ? (
        <div
          role="status"
          aria-label="프로젝트 불러오는 중"
          className="grid min-w-0 gap-2"
        >
          {/* 목록(프로젝트 줄 + 모든 프로젝트 보기)과 같은 줄 높이로 자리를 잡는다. */}
          <div aria-hidden="true" className="grid">
            {["프로젝트 이름", "프로젝트"].map((label) => (
              <span key={label} className="ui-nav-link flex items-center">
                <span className="ui-skeleton-text">{label}</span>
              </span>
            ))}
          </div>
          <span aria-hidden="true" className="ui-nav-link flex items-center">
            <span className="ui-skeleton-text">모든 프로젝트 보기</span>
          </span>
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
        <ProjectShortcuts
          projects={activeProjects}
          pathname={pathname}
          onNavigate={() => setMenuOpen(false)}
        />
      )}
    </SidebarGroup>
  );
  return (
    <div
      className="app-shell min-h-dvh"
      data-collapsed={collapsed || undefined}
      data-peeking={peeking || undefined}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-surface focus:p-3"
      >
        본문으로 건너뛰기
      </a>
      {collapsed && (
        <button
          id="sidebar-reveal"
          type="button"
          className="sidebar-reveal"
          aria-label="사이드바 미리 보기"
          aria-controls="desktop-sidebar"
          aria-expanded={peeking}
          onPointerEnter={() => peekAfter(true, 120)}
          onPointerLeave={() => {
            if (!peeking) cancelHover();
          }}
          onFocus={(event) => {
            keyboardPeek.current =
              event.currentTarget.matches(":focus-visible");
            peekNow(true);
          }}
          onBlur={(event) => {
            if (!sidebar.current?.contains(event.relatedTarget)) peekNow(false);
          }}
          onClick={() => peekNow(true)}
        />
      )}
      <aside
        ref={sidebar}
        id="desktop-sidebar"
        inert={collapsed && !peeking}
        className="app-sidebar sticky top-0 hidden h-dvh min-w-0 overflow-y-auto border-r border-border p-3 min-[60rem]:flex min-[60rem]:flex-col"
        onPointerEnter={() => {
          if (peeking) cancelHover();
        }}
        onPointerLeave={() => {
          if (
            peeking &&
            (!keyboardPeek.current ||
              !sidebar.current?.contains(document.activeElement))
          )
            peekAfter(false, 250);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            peekNow(false);
        }}
      >
        <div className="sidebar-brand">
          <Link
            href={routes.home}
            className="flex min-w-0 items-center gap-2 text-sm font-semibold"
          >
            <BrandMark size={28} label />
          </Link>
          <IconButton
            variant="ghost"
            aria-label={collapsed ? "사이드바 고정" : "사이드바 접기"}
            aria-expanded={!collapsed || peeking}
            aria-controls="desktop-sidebar"
            aria-keyshortcuts={"Meta+\\ Control+\\"}
            onClick={toggleSidebar}
          >
            <Icon name={collapsed ? "menu" : "chevronLeft"} />
          </IconButton>
        </div>
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
        <div className="sidebar-expand-bar">
          <IconButton
            variant="ghost"
            aria-label="사이드바 열기"
            aria-controls="desktop-sidebar"
            aria-expanded={!collapsed}
            onClick={toggleSidebar}
          >
            <Icon name="menu" />
          </IconButton>
        </div>
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
                onClick={openSearch}
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
          className="app-main mx-auto w-full min-w-0 p-4 outline-none min-[60rem]:p-[var(--page-inset)]"
          data-layout={
            /^\/(account|culture|guide)(\/|$)/.test(pathname) ||
            /^\/docs\/[^/]+/.test(pathname)
              ? "reading"
              : "data"
          }
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
        <SearchPalette
          open={searchOpen}
          onClose={() => {
            setSearchOpen(false);
            const target =
              collapsed && searchFromSidebar.current
                ? main.current
                : searchOpener.current;
            if (collapsed) {
              peekNow(false);
            }
            requestAnimationFrame(() => restoreFocus(target));
          }}
        />
      )}
    </div>
  );
}
