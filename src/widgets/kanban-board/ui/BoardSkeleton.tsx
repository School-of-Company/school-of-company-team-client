import type { TaskScope } from "@/entities/task";
import { routes } from "@/shared/config";
import { Icon, SegmentedLinks, Skeleton } from "@/shared/ui";

export function BoardSkeleton() {
  return (
    <div
      role="status"
      aria-label="보드를 불러오는 중"
      className="board-columns"
    >
      {Array.from({ length: 5 }, (_, column) => (
        <div
          key={column}
          className={`${column ? "hidden md:grid" : "grid"} content-start gap-3 border-t border-border p-2`}
        >
          <Skeleton className="mb-3 w-20" />
          {Array.from({ length: 3 }, (_, card) => (
            <Skeleton key={card} className="h-36 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

function ProjectTitleSkeleton() {
  return (
    <>
      <p className="board-breadcrumb">
        <span className="ui-skeleton-text">프로젝트 / 키</span>
      </p>
      <div className="flex min-w-0 items-center gap-3">
        <span className="ui-avatar ui-skeleton-text" />
        <h1 className="text-xl font-semibold">
          <span className="ui-skeleton-text">프로젝트 이름</span>
        </h1>
      </div>
    </>
  );
}

function ProjectNavSkeleton() {
  return (
    <div aria-hidden="true" className="project-nav flex min-w-0 border-b">
      {/* AGENTS.md 정보 구조의 프로젝트 탭 순서 앞부분. */}
      {["보드", "스프린트", "마일스톤", "달력", "링크"].map((label) => (
        <span
          key={label}
          className="ui-nav-link flex shrink-0 items-center border-b-2 border-transparent"
        >
          <span className="ui-skeleton-text">{label}</span>
        </span>
      ))}
    </div>
  );
}

/**
 * 보드 화면(인증 확인, Suspense, 프로젝트 확인 중)의 자리. `BoardHeader`, 툴바, 컬럼과 같은 모양이라
 * 하드 새로고침에도 제목과 툴바가 제자리에 있다.
 */
export function BoardPageSkeleton({ scope }: { readonly scope: TaskScope }) {
  const button = (
    <span aria-hidden="true" className="ui-button ui-skeleton-text">
      <span>
        <Icon name="plus" />
        업무 등록
      </span>
    </span>
  );
  return (
    <div
      role="status"
      aria-label="보드를 불러오는 중"
      className="board-workspace grid min-w-0 gap-6"
    >
      {scope === "PROJECT" ? (
        <>
          <header aria-hidden="true" className="page-header">
            <div className="min-w-0">
              <ProjectTitleSkeleton />
            </div>
            <div className="page-actions">{button}</div>
          </header>
          <ProjectNavSkeleton />
        </>
      ) : (
        <header className="page-header">
          <div className="min-w-0">
            <h1>{scope === "PERSONAL" ? "내 업무" : "팀 공용 보드"}</h1>
            <p className="page-subtitle">업무 집계 중</p>
          </div>
          <div className="page-actions">
            {scope === "PERSONAL" && (
              <SegmentedLinks
                label="보기"
                items={[
                  { href: routes.home, label: "목록", active: false },
                  { href: routes.me, label: "보드", active: true },
                ]}
              />
            )}
            {button}
          </div>
        </header>
      )}
      <div
        aria-hidden="true"
        className="board-toolbar flex min-w-0 flex-wrap items-start justify-between gap-3"
      >
        <div className="board-filter-bar">
          <span className="ui-chip-select ui-skeleton-text">필터</span>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {(scope === "PERSONAL"
            ? ["범위 내 담당", "그룹 없음", "수동 순서"]
            : ["그룹 없음", "수동 순서"]
          ).map((label) => (
            <span key={label} className="ui-chip-select ui-skeleton-text">
              {label}
            </span>
          ))}
        </div>
      </div>
      <BoardSkeleton />
    </div>
  );
}
