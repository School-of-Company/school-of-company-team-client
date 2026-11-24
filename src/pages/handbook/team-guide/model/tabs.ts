import type { GuideSection } from "../api/team-guide";

/** 팀 문화 탭. 순서가 화면 순서, `tab` 이 URL 의 ?tab= 값이다. */
export const guideTabs = [
  { tab: "culture", section: "CULTURE", label: "팀 문화" },
  { tab: "collaboration", section: "COLLABORATION", label: "협업" },
  { tab: "project", section: "PROJECT", label: "프로젝트 진행" },
  { tab: "development", section: "DEVELOPMENT", label: "개발" },
  { tab: "operations", section: "OPERATIONS", label: "운영" },
] as const satisfies readonly {
  tab: string;
  section: GuideSection;
  label: string;
}[];

export type GuideTab = (typeof guideTabs)[number];

/** 모르는 값·빈 값은 첫 탭(팀 문화)으로. */
export const readGuideTab = (value: string | null | undefined): GuideTab =>
  guideTabs.find((item) => item.tab === value) ?? guideTabs[0];
