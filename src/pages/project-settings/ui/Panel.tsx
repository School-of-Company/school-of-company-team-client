import { useId, type ReactNode } from "react";
import { InfoTip } from "@/shared/ui";

/** 설정 섹션: 제목 한 줄과 패널들. */
export function SettingsSection({
  title,
  badge,
  children,
}: {
  readonly title: string;
  readonly badge?: ReactNode;
  readonly children: ReactNode;
}) {
  const id = useId();
  return (
    <section className="settings-section" aria-labelledby={id}>
      <div className="settings-section-head">
        <h2 id={id} className="settings-section-title">
          {title}
        </h2>
        {badge}
      </div>
      {children}
    </section>
  );
}

/** 회색 패널: 머리(제목, 정보 아이콘, 오른쪽 동작) · 본문 · 아래 저장 줄. */
export function Panel({
  title,
  count,
  info,
  actions,
  footer,
  tone,
  children,
}: {
  readonly title: string;
  readonly count?: number;
  readonly info?: ReactNode;
  readonly actions?: ReactNode;
  readonly footer?: ReactNode;
  readonly tone?: "danger";
  readonly children?: ReactNode;
}) {
  const id = useId();
  return (
    <section className="settings-panel" data-tone={tone} aria-labelledby={id}>
      <div className="settings-panel-head">
        <h3 id={id} className="settings-panel-title">
          {title}
          {count !== undefined && (
            <span className="settings-panel-count">{count}</span>
          )}
          {info && <InfoTip label={`${title} 설명`}>{info}</InfoTip>}
        </h3>
        {actions}
      </div>
      {children !== undefined && (
        <div className="settings-panel-body">{children}</div>
      )}
      {footer && <div className="settings-panel-foot">{footer}</div>}
    </section>
  );
}

/** 라벨 | 값. 본문이 넓으면 라벨이 왼쪽 열에 맞춰 선다. */
export function SettingsField({
  id,
  label,
  info,
  error,
  children,
}: {
  readonly id?: string;
  readonly label: string;
  readonly info?: ReactNode;
  readonly error?: string | null;
  readonly children: ReactNode;
}) {
  return (
    <div className="settings-field">
      <span className="settings-field-label">
        {id ? <label htmlFor={id}>{label}</label> : label}
        {info && <InfoTip label={`${label} 설명`}>{info}</InfoTip>}
      </span>
      {children}
      {error && (
        <p
          id={id && `${id}-error`}
          role="alert"
          className="settings-field-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}
