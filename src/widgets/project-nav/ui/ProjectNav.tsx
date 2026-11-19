"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { projectAccess, type ProjectDetail } from "@/entities/project";
import type { User } from "@/entities/user";
import { routes } from "@/shared/config";

export type ProjectNavProps = {
  readonly project: ProjectDetail;
  readonly user: Pick<User, "id" | "role">;
};

// 탭 순서는 docs/ia.md "프로젝트 안"에 고정: 보드 · Sprint · Milestone · 설정.
export function ProjectNav({ project, user }: ProjectNavProps) {
  const pathname = usePathname() ?? "";
  const board = routes.project(project.id);
  const within = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const links = [
    { href: board, label: "보드", active: pathname === board },
    {
      href: routes.projectSprints(project.id),
      label: "Sprint",
      active: within(routes.projectSprints(project.id)),
    },
    {
      href: routes.projectMilestones(project.id),
      label: "Milestone",
      active: within(routes.projectMilestones(project.id)),
    },
    ...(projectAccess(project, user).manages
      ? [
          {
            href: routes.projectSettings(project.id),
            label: "설정",
            active: within(routes.projectSettings(project.id)),
          },
        ]
      : []),
  ];
  return (
    <nav
      aria-label={`${project.name} 프로젝트 메뉴`}
      className="project-nav flex min-w-0 overflow-x-auto border-b"
    >
      {links.map(({ href, label, active }) => (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className="ui-nav-link flex shrink-0 items-center border-b-2 border-transparent font-medium"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** 프로젝트 안 화면의 공통 머리: 경로 · 제목 · 탭. 보드는 자기 헤더(개수·동작)를 쓴다. */
export function ProjectHeading({
  project,
  user,
  trail,
}: ProjectNavProps & {
  /** 경로 끝에 붙는 현재 위치(예: Sprint 이름). */
  readonly trail?: readonly {
    readonly label: string;
    readonly href?: string;
  }[];
}) {
  return (
    <>
      <header className="min-w-0">
        <p className="board-breadcrumb flex-wrap">
          <Link href={routes.projects}>프로젝트</Link>
          <span aria-hidden="true">/</span>
          {trail?.length ? (
            <Link href={routes.project(project.id)}>{project.key}</Link>
          ) : (
            <span>{project.key}</span>
          )}
          {trail?.map((item) => (
            <span key={item.label} className="contents">
              <span aria-hidden="true">/</span>
              {item.href ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span className="min-w-0 break-words">{item.label}</span>
              )}
            </span>
          ))}
        </p>
        <h1 className="text-xl font-semibold break-words">{project.name}</h1>
      </header>
      {project.archived && (
        <p role="status" className="text-sm text-muted">
          아카이브된 프로젝트입니다. 조회만 가능합니다.
        </p>
      )}
      <ProjectNav project={project} user={user} />
    </>
  );
}
