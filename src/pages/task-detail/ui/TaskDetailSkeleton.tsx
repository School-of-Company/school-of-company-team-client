/**
 * 업무 상세 자리. 실제 머리글(돌아가기, 키, 제목)과 속성 상자, 설명 칸을 같은 클래스로 그려
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
      </div>
      <div aria-hidden="true" className="task-detail-grid">
        <div className="task-main">
          <div className="task-props">
            <dl>
              {[
                "상태",
                "우선순위",
                "타입",
                "담당자",
                "파트",
                "시작일",
                "마감일",
                "버킷",
              ].map((label) => (
                <div key={label}>
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
