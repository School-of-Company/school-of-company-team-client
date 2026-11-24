"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AuthGuard } from "@/features/auth";
import { routes } from "@/shared/config";
import { Markdown, Select } from "@/shared/ui";
import { guideSections } from "../model/sections";

/** 사용법: 기능별 짧은 안내. 왼쪽 목차, 오른쪽 본문. */
export function GuidePage() {
  return <AuthGuard require="work">{() => <GuideContent />}</AuthGuard>;
}

function GuideContent() {
  const [active, setActive] = useState(guideSections[0].id);
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = content.current;
    if (!root) return;
    const atEnd = () =>
      root.scrollTop + root.clientHeight >= root.scrollHeight - 1;
    const onScroll = () => {
      if (atEnd()) setActive(guideSections[guideSections.length - 1].id);
    };
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        if (atEnd()) {
          onScroll();
          return;
        }
        for (const entry of entries) {
          if (entry.isIntersecting)
            visible.set(entry.target.id, entry.boundingClientRect.top);
          else visible.delete(entry.target.id);
        }
        const first = [...visible].sort((a, b) => a[1] - b[1])[0];
        if (first) setActive(first[0]);
      },
      { root, rootMargin: "0px 0px -55% 0px", threshold: 0 },
    );
    root
      .querySelectorAll("section")
      .forEach((section) => observer.observe(section));
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      root.removeEventListener("scroll", onScroll);
    };
  }, []);
  const goTo = (id: string) => {
    const root = content.current;
    const section = root?.querySelector<HTMLElement>(`#${id}`);
    if (!root || !section) return;
    root.scrollTo({
      top:
        root.scrollTop +
        section.getBoundingClientRect().top -
        root.getBoundingClientRect().top,
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
      <header className="page-header">
        <div className="min-w-0">
          <h1>사용법</h1>
          <p className="page-subtitle">
            처음이라면 위에서부터 읽어 보세요. 팀의 약속은{" "}
            <Link href={routes.culture} className="underline">
              팀 문화
            </Link>
            에 있습니다.
          </p>
        </div>
      </header>
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
