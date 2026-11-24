import { formatDate } from "@/shared/lib";

const seoulYear = (date: Date) =>
  new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(date);

/** 사고 시각은 분 단위가 의미 있다. 표시는 다른 화면과 같이 Asia/Seoul, 올해면 연도를 줄인다(속성 열 한 줄 유지). */
export function formatDateTime(
  value: string | null | undefined,
  now: Date = new Date(),
): string {
  const date = value ? new Date(value) : null;
  const sameYear =
    !!date &&
    !Number.isNaN(date.getTime()) &&
    seoulYear(date) === seoulYear(now);
  return formatDate(value, {
    year: sameYear ? undefined : "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}
