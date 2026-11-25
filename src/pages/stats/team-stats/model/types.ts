import type { ProjectStage } from "@/entities/project";

/** s18 `TeamStatsResponse`. 팀(`/stats/team`)과 나(`/me/stats`)가 같은 형태다. 사람 정보는 없다. */
export type StatsRange = "4w" | "12w" | "26w";

export type WeekCount = { readonly weekStart: string; readonly count: number };

export type TeamStats = {
  readonly range: StatsRange;
  readonly from: string;
  readonly to: string;
  readonly projectId: string | null;
  readonly weeks: readonly string[];
  readonly flow: {
    readonly completedPerWeek: readonly WeekCount[];
    readonly completedCount: number;
    readonly cycleTime: {
      readonly medianHours: number | null;
      readonly p75Hours: number | null;
      readonly sampleCount: number;
      readonly approximateCount: number;
    };
    readonly reviewWait: {
      readonly medianHours: number | null;
      readonly sampleCount: number;
    };
    readonly blocked: {
      readonly totalHours: number;
      readonly blockedTaskCount: number;
      readonly taskCount: number;
      readonly share: number | null;
    };
    readonly wip: number;
  };
  readonly sprint: {
    readonly sprints: readonly {
      readonly id: string;
      readonly projectId: string;
      readonly name: string;
      readonly closedAt: string;
      readonly plannedCount: number;
      readonly doneCount: number;
      readonly completionRate: number | null;
      readonly velocity: number;
      readonly carryOverCount: number;
      readonly carryOverRate: number | null;
    }[];
    readonly averages: {
      readonly completionRate: number | null;
      readonly velocity: number | null;
      readonly carryOverRate: number | null;
    };
  };
  /** 팀 통계에서 프로젝트 필터가 없을 때만. 개인 통계와 프로젝트 필터는 null. */
  readonly ops: {
    readonly incidentsPerWeek: readonly WeekCount[];
    readonly incidentCount: number;
    readonly meanTimeToMitigateHours: number | null;
    readonly meanTimeToResolveHours: number | null;
    readonly deploysPerWeek: readonly WeekCount[];
    readonly deployCount: number;
  } | null;
  /** 팀 통계만. 개인 통계는 null. */
  readonly projects:
    | readonly {
        readonly id: string;
        readonly key: string;
        readonly name: string;
        readonly stage: ProjectStage;
        readonly milestones: {
          readonly total: number;
          readonly planned: number;
          readonly inProgress: number;
          readonly done: number;
          readonly delayed: number;
          readonly taskTotal: number;
          readonly taskDone: number;
        };
      }[]
    | null;
};
