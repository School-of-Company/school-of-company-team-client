import type { ReactNode } from "react";

/**
 * 모든 화면의 머리글. 부제 줄은 값이 아직 없어도(집계 중, 실패) 한 줄을 잡아 두어
 * 데이터가 와도 아래 본문이 밀리지 않는다. 부제가 아예 없는 화면은 `subtitle={false}`로 줄을 뺀다.
 * 집계 중에는 `undefined` 대신 "집계 중" 문구를 넘긴다.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  readonly title: ReactNode;
  /** `false`면 부제 줄을 두지 않는다. 그 밖의 값(빈 값 포함)은 한 줄을 잡는다. */
  readonly subtitle?: ReactNode | false;
  readonly actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="min-w-0">
        <h1>{title}</h1>
        {subtitle !== false && (
          <p className="page-subtitle tabular-nums">{subtitle}</p>
        )}
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
  subtitle = true,
}: {
  readonly label?: string;
  /** 부제가 없는 화면(`PageHeader subtitle={false}`)은 `false`로 맞춘다. */
  readonly subtitle?: boolean;
}) {
  return (
    <div role="status" aria-label={label} className="grid gap-5">
      <header aria-hidden="true" className="page-header">
        <div className="min-w-0">
          <h1>
            <span className="ui-skeleton-text">불러오는 중</span>
          </h1>
          {subtitle && <p className="page-subtitle" />}
        </div>
      </header>
      <div aria-hidden="true" className="ui-empty" />
    </div>
  );
}
