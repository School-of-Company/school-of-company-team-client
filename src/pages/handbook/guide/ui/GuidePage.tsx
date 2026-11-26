"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AuthGuard } from "@/features/auth";
import { routes } from "@/shared/config";
import { Markdown, PageHeader, Select } from "@/shared/ui";
import { activeSection } from "../model/scroll-spy";
import { guideSections } from "../model/sections";

/** 사용법: 기능별 짧은 안내. 왼쪽 목차, 오른쪽 본문. */
export function GuidePage() {
  return <AuthGuard require="work">{() => <GuideContent />}</AuthGuard>;
}

function GuideContent() {
  const [active, setActive] = useState(guideSections[0].id);
  const content = useRef<HTMLDivElement>(null);
  // 목차를 누른 뒤에는 사용자가 직접 스크롤할 때까지 강조를 누른 절에 고정한다.
  // 부드러운 스크롤이 지나가는 절마다 강조가 옮겨 다니거나, 끝까지 못 가는 절을 눌렀을 때 마지막 절로 바뀌지 않게 한다.
  const locked = useRef(false);
  useEffect(() => {
    const root = content.current;
    if (!root) return;
    const onScroll = () => {
      if (locked.current) return;
      const next = activeSection(
        guideSections.map(({ id }) => ({
          id,
          top: sectionTop(root, root.querySelector(`#${id}`)),
        })),
        root,
      );
      if (next) setActive(next);
    };
    const release = () => {
      locked.current = false;
    };
    const input = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    root.addEventListener("scroll", onScroll, { passive: true });
    for (const type of input)
      root.addEventListener(type, release, { passive: true });
    return () => {
      root.removeEventListener("scroll", onScroll);
      for (const type of input) root.removeEventListener(type, release);
    };
  }, []);
  const goTo = (id: string) => {
    const root = content.current;
    const section = root?.querySelector<HTMLElement>(`#${id}`);
    if (!root || !section) return;
    locked.current = true;
    root.scrollTo({
      top: sectionTop(root, section),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    setActive(id);
    window.history.replaceState(null, "", `#${id}`);
    section.focus({ preventScroll: true });
  };
  return (
    <div className="guide-page break-keep">
      <PageHeader
        title="사용법"
        subtitle={
          <>
            처음이라면 위에서부터 읽어 보세요. 팀의 약속은{" "}
            <Link href={routes.culture} className="underline">
              팀 문화
            </Link>
            에 있습니다.
          </>
        }
      />
      <div className="guide-layout">
        <div className="guide-mobile-toc">
          <label htmlFor="guide-section-select" className="sr-only">
            사용법 목차
          </label>
          <Select
            id="guide-section-select"
            value={active}
            onChange={(event) => goTo(event.target.value)}
          >
            {guideSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.title}
              </option>
            ))}
          </Select>
        </div>
        <nav aria-label="사용법 목차" className="guide-toc">
          <ol>
            {guideSections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-current={active === section.id ? "location" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    goTo(section.id);
                  }}
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div
          ref={content}
          className="guide-sections"
          tabIndex={0}
          role="region"
          aria-label="사용법 본문"
        >
          {guideSections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-title`}
              className="guide-section"
              tabIndex={-1}
            >
              <h2 id={`${section.id}-title`}>{section.title}</h2>
              <Markdown>{section.body}</Markdown>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 스크롤 영역 맨 위 기준 절 위치(지금 스크롤 값을 더해 스크롤과 무관한 값). */
function sectionTop(root: HTMLElement, section: Element | null) {
  if (!section) return Number.POSITIVE_INFINITY;
  return (
    root.scrollTop +
    section.getBoundingClientRect().top -
    root.getBoundingClientRect().top
  );
}
