"use client";

import Link from "next/link";
import { AuthGuard } from "@/features/auth";
import { routes } from "@/shared/config";
import { Markdown } from "@/shared/ui";
import { guideSections } from "../model/sections";

/** 사용법: 기능별 짧은 안내. 왼쪽 목차, 오른쪽 본문. */
export function GuidePage() {
  return (
    <AuthGuard require="work">
      {() => (
        <div className="guide-page">
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
            <nav aria-label="사용법 목차" className="guide-toc">
              <ol>
                {guideSections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>{section.title}</a>
                  </li>
                ))}
              </ol>
            </nav>
            <div className="guide-sections">
              {guideSections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  aria-labelledby={`${section.id}-title`}
                  className="guide-section"
                >
                  <h2 id={`${section.id}-title`}>{section.title}</h2>
                  <Markdown>{section.body}</Markdown>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
