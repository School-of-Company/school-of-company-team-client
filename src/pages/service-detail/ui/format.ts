import { formatDate } from "@/shared/lib";

export const formatDateTime = (value: string | null | undefined) =>
  formatDate(value, { hour: "2-digit", minute: "2-digit" });

/** 배포 소요 시간. 끝나지 않았으면 null. */
export function formatDuration(
  start: string,
  end: string | null,
): string | null {
  if (!end) return null;
  const seconds = Math.max(
    0,
    Math.round((Date.parse(end) - Date.parse(start)) / 1000),
  );
  if (Number.isNaN(seconds)) return null;
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 ${seconds % 60}초`;
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`;
}

export const shortSha = (sha: string) => sha.slice(0, 7);
