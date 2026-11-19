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

const pad = (value: number) => String(value).padStart(2, "0");

/** ISO → `<input type="datetime-local">` 값(브라우저 지역 시각, 분 단위). */
export function toLocalInput(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `datetime-local` 값 → ISO(오프셋 포함). 비었거나 잘못되면 undefined(서버가 "지금"을 쓴다). */
export function fromLocalInput(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
