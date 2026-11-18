export type FilterState = Readonly<Record<string, readonly string[]>>;

export function readFilters(
  params: URLSearchParams,
  keys: readonly string[],
): FilterState {
  return Object.fromEntries(
    keys.map((key) => [key, [...new Set(params.getAll(key).filter(Boolean))]]),
  );
}

export function writeFilters(
  params: URLSearchParams,
  filters: FilterState,
): URLSearchParams {
  const result = new URLSearchParams(params);
  for (const [key, values] of Object.entries(filters)) {
    result.delete(key);
    for (const value of new Set(values.filter(Boolean)))
      result.append(key, value);
  }
  return result;
}

export function formatDate(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  }).format(date);
}

const relative = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });

/** "3분 전", "5시간 전", "2일 전". 48시간까지는 시간 단위로 센다(24시간 기준이 보이게). */
export function relativeSince(value: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - Date.parse(value)) / 60_000));
  if (minutes < 60) return relative.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 48) return relative.format(-hours, "hour");
  return relative.format(-Math.round(hours / 24), "day");
}

export {
  applyTheme,
  applyThemePreference,
  readThemePreference,
  readTheme,
  subscribeTheme,
  themeBootScript,
  THEME_STORAGE_KEY,
  type Theme,
  type ThemePreference,
} from "./theme";

export { keepsLastData, useLastData, LAST_DATA_LIMIT } from "./last-data";
export {
  HIDDEN_REPOSITORY,
  keepPreviousKey,
  refetchOnVisit,
  repositoryName,
} from "./query";
