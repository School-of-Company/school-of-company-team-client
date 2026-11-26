/**
 * 프로젝트 조회 중 자리. `ProjectHeading`과 같은 클래스(경로 줄, 아바타와 제목 줄, 탭 줄)로 높이를 그대로 잡고,
 * 아래 본문은 빈 상태 높이만큼 잡아 프로젝트가 와도 머리글이 움직이지 않는다.
 */
export function ProjectHeadingSkeleton({
  label = "프로젝트 불러오는 중",
}: {
  readonly label?: string;
}) {
  return (
    <div role="status" aria-label={label} className="grid min-w-0 gap-6">
      <header aria-hidden="true" className="min-w-0">
        <p className="board-breadcrumb flex-wrap">
          <span className="ui-skeleton-text">프로젝트 / KEY</span>
        </p>
        <div className="flex min-w-0 items-center gap-3">
          <span className="ui-avatar ui-skeleton-text" />
          <h1 className="text-xl font-semibold wrap-anywhere">
            <span className="ui-skeleton-text">프로젝트 불러오는 중</span>
          </h1>
        </div>
      </header>
      <div
        aria-hidden="true"
        className="project-nav flex min-w-0 overflow-x-auto border-b"
      >
        <span className="ui-nav-link flex shrink-0 items-center border-b-2 border-transparent font-medium">
          <span className="ui-skeleton-text">보드 문서 스프린트 마일스톤</span>
        </span>
      </div>
      <div aria-hidden="true" className="ui-empty" />
    </div>
  );
}
