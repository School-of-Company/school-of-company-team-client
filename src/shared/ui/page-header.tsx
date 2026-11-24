import type { ReactNode } from "react";

/**
 * 모든 화면의 머리글. 부제 줄은 값이 아직 없어도(집계 중, 실패) 한 줄을 잡아 두어
 * 데이터가 와도 아래 본문이 밀리지 않는다.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  readonly actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="min-w-0">
        <h1>{title}</h1>
        <p className="page-subtitle tabular-nums">{subtitle}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

/**
 * 인증 확인과 라우트 로딩 중 자리. `PageHeader`와 같은 줄 높이로 제목과 부제를 잡고,
 * 본문은 빈 상태 높이만큼 잡아 하드 새로고침에도 머리글이 움직이지 않는다.
 */
export function PageSkeleton({
  label = "불러오는 중",
}: {
  readonly label?: string;
}) {
  return (
    <div role="status" aria-label={label} className="grid gap-5">
      <header aria-hidden="true" className="page-header">
        <div className="min-w-0">
          <h1>
            <span className="ui-skeleton-text">불러오는 중</span>
          </h1>
          <p className="page-subtitle" />
        </div>
      </header>
      <div aria-hidden="true" className="ui-empty" />
    </div>
  );
}
