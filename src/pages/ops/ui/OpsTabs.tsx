"use client";

import Link from "next/link";
import { routes } from "@/shared/config";

export const opsTabs = [
  { value: "status", label: "상태" },
  { value: "incidents", label: "장애" },
  { value: "services", label: "서비스" },
  { value: "deploys", label: "배포" },
] as const;
export type OpsTab = (typeof opsTabs)[number]["value"];

/** 머리글 바로 아래 탭 줄. 탭을 바꾸면 그 탭의 필터는 비운다(탭마다 쓰는 쿼리가 다르다). */
export function OpsTabs({ active }: { readonly active: OpsTab }) {
  return (
    <nav
      aria-label="운영 메뉴"
      className="project-nav flex min-w-0 overflow-x-auto border-b"
    >
      {opsTabs.map((item) => (
        <Link
          key={item.value}
          href={
            item.value === "status"
              ? routes.ops
              : `${routes.ops}?tab=${item.value}`
          }
          aria-current={active === item.value ? "page" : undefined}
          className="ui-nav-link flex shrink-0 items-center border-b-2 border-transparent font-medium"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
