import type { Milestone, MilestoneSprint } from "@/entities/milestone";
import { addMonths, formatDate } from "@/shared/lib";
import { formatRange } from "./dates";

/** 로드맵 위 위치. 둘 다 전체 기간 대비 %. */
export type Span = { readonly left: number; readonly width: number };

export type RoadmapRow = {
  readonly milestone: Milestone;
  readonly bar: Span;
  readonly sprints: readonly {
    readonly sprint: MilestoneSprint;
    readonly span: Span;
  }[];
};

export type Roadmap = {
  readonly months: readonly {
    readonly key: string;
    readonly label: string;
    readonly left: number;
  }[];
  /** 기간은 늘 오늘을 덮는다. 타임라인에 놓을 마일스톤이 없으면 null. */
  readonly today: number | null;
  readonly rows: readonly RoadmapRow[];
  /** 시작일도 마감일도 없어 타임라인에 놓을 수 없는 마일스톤. */
  readonly undated: readonly Milestone[];
};

const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;

/**
 * 마일스톤(시작 → 마감)과 연결 스프린트를 한 기간 위에 놓는다. 기간은 모든 날짜와 오늘을 덮는 달 단위.
 * 날짜 문자열끼리 계산해 시간대 영향이 없다. 순서는 서버(`view=roadmap`) 그대로.
 */
export function roadmapLayout(
  milestones: readonly Milestone[],
  today: string,
): Roadmap {
  const dated = milestones.filter((item) => item.timelineStart || item.dueDate);
  const undated = milestones.filter(
    (item) => !item.timelineStart && !item.dueDate,
  );
  if (!dated.length) return { months: [], today: null, rows: [], undated };
  const dates = [
    today,
    ...dated.flatMap((item) => [
      item.timelineStart,
      item.dueDate,
      ...item.sprints.flatMap((sprint) => [sprint.startDate, sprint.endDate]),
    ]),
  ]
    .filter((value): value is string => !!value)
    .sort();
  const first = `${dates[0].slice(0, 7)}-01`;
  // 마지막 날짜가 든 달의 다음 달 1일(배타적 끝).
  const end = addMonths(`${dates.at(-1)!.slice(0, 7)}-01`, 1);
  const length = day(end) - day(first);
  const at = (iso: string) => ((day(iso) - day(first)) / length) * 100;
  const span = (start: string, finish: string): Span => ({
    left: at(start),
    width: ((day(finish) - day(start) + 1) / length) * 100,
  });
  const months: Roadmap["months"][number][] = [];
  for (let month = first; month < end; month = addMonths(month, 1)) {
    const [year, value] = month.split("-");
    months.push({
      key: month,
      label:
        month === first || value === "01"
          ? `${year}년 ${Number(value)}월`
          : `${Number(value)}월`,
      left: at(month),
    });
  }
  return {
    months,
    today: at(today),
    rows: dated.map((milestone) => {
      const start = (milestone.timelineStart ?? milestone.dueDate)!;
      // 마감일이 없으면 오늘까지(아직 시작 전이면 시작일 하루).
      const finish = milestone.dueDate ?? (today > start ? today : start);
      return {
        milestone,
        bar: span(start, finish < start ? start : finish),
        sprints: milestone.sprints.map((sprint) => ({
          sprint,
          span: span(sprint.startDate, sprint.endDate),
        })),
      };
    }),
    undated,
  };
}

/** "11월 1일 – 12월 20일", "12월 20일 마감", "11월 1일 시작", "날짜 없음". */
export function milestoneDateLabel(milestone: Milestone) {
  const { timelineStart: start, dueDate: due } = milestone;
  if (start && due) return formatRange(start, due);
  if (due) return `${formatDate(due, { year: undefined })} 마감`;
  if (start) return `${formatDate(start, { year: undefined })} 시작`;
  return "날짜 없음";
}
