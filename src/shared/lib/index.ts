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
export { keepPreviousKey } from "./query";
