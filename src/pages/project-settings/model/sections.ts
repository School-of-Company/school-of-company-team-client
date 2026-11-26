export const settingsSections = [
  { id: "general", label: "기본 정보" },
  { id: "members", label: "멤버와 권한" },
  { id: "integrations", label: "연동" },
  { id: "buckets", label: "계획 버킷" },
  { id: "notifications", label: "알림" },
  // 자동화, 접수 양식은 헤드 어드민과 PM 에게만 있다(규칙, 양식 API 도 그들만 허용).
  { id: "automation", label: "자동화", managerOnly: true },
  { id: "intake", label: "접수 양식", managerOnly: true },
] as const;

export type SettingsSection = (typeof settingsSections)[number]["id"];

export const visibleSections = (manager: boolean) =>
  settingsSections.filter((section) => manager || !("managerOnly" in section));

/** `/projects/:id/settings/:section` 의 섹션. 기본 정보는 `/settings` 그대로다. */
export const sectionPath = (settingsPath: string, section: SettingsSection) =>
  section === "general" ? settingsPath : `${settingsPath}/${section}`;

/**
 * 주소에서 섹션을 고른다. 경로 조각이 먼저고, 예전 `?tab=` 주소는 같은 섹션으로 읽는다.
 * 모르는 값이나 볼 수 없는 섹션은 기본 정보다.
 */
export function resolveSection(
  segment: string | undefined,
  legacyTab: string | null | undefined,
  manager: boolean,
): SettingsSection {
  const wanted = segment ?? legacyTab ?? "general";
  return (
    visibleSections(manager).find((section) => section.id === wanted)?.id ??
    "general"
  );
}

/** `/projects/x/settings/members/...` → "members". 설정 경로 아래가 없으면 undefined. */
export const sectionSegment = (pathname: string) =>
  /\/settings\/([^/?#]+)/.exec(pathname)?.[1];
