import type { Burndown } from "@/entities/sprint";

const DAY = 86_400_000;
const dayIndex = (start: string, date: string) =>
  Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY,
  );

/**
 * 번다운을 0~1 좌표의 점으로 바꾼다. x는 시작일~종료일, y는 0~최댓값(위가 1).
 * 남은 양은 계약 basis(D14-i) 단위로 읽는다.
 */
export function burndownPoints(
  data: Burndown,
  range: { readonly startDate: string; readonly endDate: string },
) {
  const span = Math.max(dayIndex(range.startDate, range.endDate), 1);
  const remaining = data.days.map((day) => ({
    date: day.date,
    value: data.basis === "WEIGHT" ? day.remainingWeight : day.remainingCount,
  }));
  const max = Math.max(
    1,
    ...remaining.map((point) => point.value),
    ...data.ideal.map((point) => point.remaining),
  );
  const place = (date: string, value: number) => ({
    x: Math.min(Math.max(dayIndex(range.startDate, date) / span, 0), 1),
    y: value / max,
  });
  return {
    max,
    remaining: remaining.map((point) => ({
      ...point,
      ...place(point.date, point.value),
    })),
    ideal: data.ideal.map((point) => ({
      date: point.date,
      value: point.remaining,
      ...place(point.date, point.remaining),
    })),
  };
}

/** 날짜별 표(차트 대신 읽는 표): 이상선 날짜와 스냅샷 날짜를 합친다. */
export function burndownRows(data: Burndown) {
  const rows = new Map<
    string,
    { remaining: number | null; ideal: number | null }
  >();
  for (const point of data.ideal)
    rows.set(point.date, { remaining: null, ideal: point.remaining });
  for (const day of data.days)
    rows.set(day.date, {
      ideal: rows.get(day.date)?.ideal ?? null,
      remaining:
        data.basis === "WEIGHT" ? day.remainingWeight : day.remainingCount,
    });
  return [...rows.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, row]) => ({ date, ...row }));
}
