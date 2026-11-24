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

/**
 * 프로젝트 안 화면(보드, 스프린트, 링크 등) 머리의 임시 자리: 경로, 아바타와 제목, 탭 줄.
 * `ProjectHeading`과 같은 클래스와 줄 높이라 프로젝트를 받아도 탭 줄이 움직이지 않는다.
 * TODO: `@/widgets/project-nav`의 공용 ProjectHeadingSkeleton이 들어오면 그것으로 바꾼다.
 */
function ProjectHeadingPlaceholder() {
  return (
    <>
      <header aria-hidden="true" className="min-w-0">
        <ProjectTitleSkeleton />
      </header>
      <ProjectNavSkeleton />
    </>
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

/** 프로젝트 안 화면의 라우트 로딩, 프로젝트 확인 중 자리. 본문은 빈 상태 높이로 잡는다. */
export function ProjectPageSkeleton({
  label = "프로젝트 화면 불러오는 중",
}: {
  readonly label?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className="planning-page grid min-w-0 gap-6"
    >
      <ProjectHeadingPlaceholder />
      <div aria-hidden="true" className="ui-empty" />
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
