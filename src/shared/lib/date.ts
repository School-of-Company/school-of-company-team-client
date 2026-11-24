/** 날짜 규칙(YYYY-MM-DD 문자열). 시간대 혼동을 피하려고 계산은 모두 UTC 자정으로 한다. */

const seoulDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Asia/Seoul 기준 오늘(YYYY-MM-DD). 서버 판정과 같은 "오늘". */
export const todayIso = (now: number | Date = Date.now()) =>
  seoulDate.format(now);

const toUtc = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};
const fromUtc = (date: Date) => date.toISOString().slice(0, 10);

export function addDays(iso: string, days: number): string {
  const date = toUtc(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtc(date);
}

/** 달을 옮기고 날은 그 달의 마지막 날로 맞춘다(1월 31일 + 1달 = 2월 28/29일). */
export function addMonths(iso: string, months: number): string {
  const date = toUtc(iso);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return fromUtc(date);
}

/** 0(일)~6(토). */
export const weekday = (iso: string) => toUtc(iso).getUTCDay();

/** 그 날이 든 달을 일요일부터 6주(42칸)로 편다. */
export function monthGrid(iso: string): readonly string[] {
  const first = `${iso.slice(0, 7)}-01`;
  const start = addDays(first, -weekday(first));
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export type DateBounds = { readonly min?: string; readonly max?: string };

/** ISO 문자열은 사전순이 곧 날짜순이다. */
export function isOutOfRange(iso: string, { min, max }: DateBounds): boolean {
  return (!!min && iso < min) || (!!max && iso > max);
}

export function clampDate(iso: string, { min, max }: DateBounds): string {
  if (min && iso < min) return min;
  if (max && iso > max) return max;
  return iso;
}

/** 빈 값은 무시하고 가장 늦은 날. 모두 비면 undefined. */
export function latestDate(
  ...values: readonly (string | null | undefined)[]
): string | undefined {
  return values
    .filter((value): value is string => !!value)
    .sort()
    .at(-1);
}

// ponytail: Asia/Seoul 은 서머타임 없이 늘 +09:00 이라 고정 오프셋으로 바꾼다.
const seoulOffset = 9 * 60 * 60 * 1000;

/** ISO 시각 → Asia/Seoul 벽시계 "YYYY-MM-DDTHH:mm". 비었거나 잘못되면 "". 브라우저 시간대와 무관하다. */
export function toSeoulDateTime(iso: string | null | undefined): string {
  const time = iso ? Date.parse(iso) : Number.NaN;
  return Number.isNaN(time)
    ? ""
    : new Date(time + seoulOffset).toISOString().slice(0, 16);
}

/** Asia/Seoul 날짜("YYYY-MM-DD")와 시각("HH:mm") → ISO(UTC). 잘못되면 "". */
export function fromSeoulDateTime(date: string, time: string): string {
  const parsed = Date.parse(`${date}T${time}:00+09:00`);
  return Number.isNaN(parsed) ? "" : new Date(parsed).toISOString();
}
