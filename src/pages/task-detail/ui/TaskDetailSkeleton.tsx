/** 프로젝트 업무의 속성 줄. 셀렉트가 들어가는 줄은 실제와 같이 `task-prop-control`로 높이를 잡는다. */
const props = [
  ["상태", true],
  ["우선순위", false],
  ["타입", false],
  ["담당자", false],
  ["버킷", true],
  ["스프린트", false],
  ["마일스톤", true],
  ["리뷰어", false],
  ["파트", false],
  ["시작일", false],
  ["마감일", false],
] as const;

/**
 * 업무 상세 자리. 실제 머리글(돌아가기, 키, 제목, 동작 줄)과 속성 상자, 설명 칸을 같은 클래스로 그려
 * 라우트 로딩, 인증 확인, 첫 조회가 모두 같은 모양이다. 패널(`back={false}`)에는 돌아가기 줄이 없다.
 */
export function TaskDetailSkeleton({
  back = true,
}: {
  readonly back?: boolean;
}) {
  return (
    <div role="status" aria-label="업무를 불러오는 중" className="task-detail">
      <div aria-hidden="true" className="task-detail-heading">
        {back && (
          <span className="task-detail-back ui-button ui-button-ghost ui-button-sm -ml-2">
            <span className="ui-skeleton-text">보드로 돌아가기</span>
          </span>
        )}
        <header className="grid min-w-0 flex-1 gap-1">
          <p className="font-mono text-xs text-muted">
            <span className="ui-skeleton-text">SOC-00</span>
          </p>
          <h1 className="task-title">
            <span className="ui-skeleton-text">업무 제목을 불러오는 중</span>
          </h1>
        </header>
        <span className="task-detail-actions flex flex-wrap items-center gap-2">
          <span className="ui-button ui-button-secondary ui-button-sm">
            <span className="ui-skeleton-text">수정</span>
          </span>
        </span>
      </div>
      <div aria-hidden="true" className="task-detail-grid">
        <div className="task-main">
          <div className="task-props">
            <dl>
              {props.map(([label, control]) => (
                <div
                  key={label}
                  className={control ? "task-prop-control" : undefined}
                >
                  <dt>
                    <span className="ui-skeleton-text">{label}</span>
                  </dt>
                  <dd>
                    <span className="ui-skeleton-text">불러오는 중</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <section>
            <h2 className="task-section-title">
              <span className="ui-skeleton-text">설명</span>
            </h2>
            <div className="ui-skeleton-list" />
          </section>
        </div>
      </div>
    </div>
  );
}
