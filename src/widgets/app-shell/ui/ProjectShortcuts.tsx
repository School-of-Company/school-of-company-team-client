"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ProjectAvatar, type Project } from "@/entities/project";
import { routes } from "@/shared/config";
import { Input } from "@/shared/ui";
import { sidebarProjects } from "../model/sidebar";

const key = "soc.sidebar.recent-projects";
const subscribe = (listener: () => void) => {
  window.addEventListener("sidebar-recents", listener);
  return () => window.removeEventListener("sidebar-recents", listener);
};
const readRecent = () => {
  try {
    return localStorage.getItem(key) ?? "[]";
  } catch {
    return "[]";
  }
};

export function ProjectShortcuts({
  projects,
  pathname,
  onNavigate,
}: {
  readonly projects: readonly Project[];
  readonly pathname: string;
  readonly onNavigate: () => void;
}) {
  const [filter, setFilter] = useState("");
  const stored = useSyncExternalStore(subscribe, readRecent, () => "[]");
  let recent: readonly string[] = [];
  try {
    const parsed: unknown = JSON.parse(stored);
    if (Array.isArray(parsed))
      recent = parsed.filter(
        (value): value is string => typeof value === "string",
      );
  } catch {
    /* Ignore invalid local preferences. */
  }
  useEffect(() => {
    const current = projects.find(
      (project) =>
        pathname === routes.project(project.id) ||
        pathname.startsWith(`${routes.project(project.id)}/`),
    );
    if (!current) return;
    try {
      const parsed: unknown = JSON.parse(readRecent());
      const ids = Array.isArray(parsed)
        ? parsed.filter(
            (value): value is string =>
              typeof value === "string" && value !== current.id,
          )
        : [];
      localStorage.setItem(
        key,
        JSON.stringify([current.id, ...ids].slice(0, 7)),
      );
      window.dispatchEvent(new Event("sidebar-recents"));
    } catch {
      /* Recent projects are optional when storage is unavailable. */
    }
  }, [pathname, projects]);
  const shown = sidebarProjects(projects, recent, filter);
  return (
    <div className="grid min-w-0 gap-2">
      {projects.length > 7 && (
        <Input
          type="search"
          aria-label="프로젝트 빠른 검색"
          placeholder="프로젝트 검색"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      )}
      <div className="sidebar-project-list">
        {shown.map((project) => {
          const href = routes.project(project.id);
          return (
            <Link
              key={project.id}
              href={href}
              aria-current={
                pathname === href || pathname.startsWith(`${href}/`)
                  ? "page"
                  : undefined
              }
              className="ui-nav-link flex min-w-0 items-center"
              onClick={onNavigate}
            >
              <ProjectAvatar project={project} />
              <span className="truncate" title={project.name}>
                {project.name}
              </span>
            </Link>
          );
        })}
        {shown.length === 0 && (
          <p className="px-3 text-sm text-muted">검색 결과가 없습니다.</p>
        )}
      </div>
      <Link className="ui-nav-link" href={routes.projects} onClick={onNavigate}>
        모든 프로젝트 보기
      </Link>
    </div>
  );
}
