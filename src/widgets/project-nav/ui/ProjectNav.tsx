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

export function ProjectNav({ project, user }: ProjectNavProps) {
  const pathname = usePathname();
  const board = routes.project(project.id);
  const settings = routes.projectSettings(project.id);
  const links = [
    { href: board, label: "보드", active: pathname === board },
    ...(projectAccess(project, user).manages
      ? [
          {
            href: settings,
            label: "설정",
            active:
              pathname === settings ||
              Boolean(pathname?.startsWith(`${settings}/`)),
          },
        ]
      : []),
  ];
  return (
    <nav
      aria-label={`${project.name} 프로젝트 메뉴`}
      className="flex min-w-0 gap-4 overflow-x-auto border-b border-border"
    >
      {links.map(({ href, label, active }) => (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={`ui-nav-link flex min-h-11 shrink-0 items-center border-b-2 px-2 text-sm font-medium ${active ? "border-brand text-brand" : "border-transparent text-muted hover:text-foreground"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
