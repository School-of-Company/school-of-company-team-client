/** 완료 비율 막대. 숫자는 옆 글자로 함께 보여 주고 막대는 장식이 아닌 meter 로 읽힌다. */
export function ProgressBar({
  done,
  total,
  label,
  percent: given,
}: {
  readonly done: number;
  readonly total: number;
  readonly label: string;
  /** 개수가 아닌 비율(예: 마일스톤 크기 기준)로 막대를 채울 때. 없으면 done/total. */
  readonly percent?: number;
}) {
  const percent = given ?? (total ? Math.floor((done / total) * 100) : 0);
  return (
    <span className="planning-progress">
      <span
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={`${total}개 중 ${done}개 완료, ${percent}%`}
        className="planning-progress-track"
      >
        <span
          className="planning-progress-fill"
          style={{ transform: `scaleX(${percent / 100})` }}
        />
      </span>
      <span className="planning-progress-text tabular-nums">
        {done}/{total}
        <span className="text-muted"> {percent}%</span>
      </span>
    </span>
  );
}
