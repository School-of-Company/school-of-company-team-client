import type { CSSProperties } from "react";
import { milestoneStatusLabels, type Milestone } from "@/entities/milestone";
import { sprintStatusLabels } from "@/entities/sprint";
import { milestoneDateLabel, roadmapLayout, type Span } from "../model/roadmap";
import { MilestoneRiskBadge, MilestoneStatusBadge } from "./MilestoneBadges";

const place = (span: Span): CSSProperties => ({
  left: `${span.left}%`,
  width: `${span.width}%`,
});

/**
 * 가로 타임라인: 왼쪽 이름 칸, 오른쪽 기간 막대와 그 아래 연결 스프린트 막대, 오늘 선.
 * 막대는 그림일 뿐이라 화면 낭독기와 390폭은 이름 칸의 기간, 스프린트 글자를 읽는다(좁으면 세로 목록).
 */
export function MilestoneRoadmap({
  milestones,
  today,
  onOpen,
}: {
  readonly milestones: readonly Milestone[];
  readonly today: string;
  readonly onOpen: (id: string) => void;
}) {
  const layout = roadmapLayout(milestones, today);
  const items = [
    ...layout.rows,
    ...layout.undated.map((milestone) => ({
      milestone,
      bar: null,
      sprints: [],
    })),
  ];
  return (
    <div className="roadmap-viewport">
      <div
        className="roadmap"
        data-dated={layout.today !== null || undefined}
        style={{ "--roadmap-today": `${layout.today ?? 0}%` } as CSSProperties}
      >
        {layout.today !== null && (
          <div className="roadmap-scale" aria-hidden="true">
            <span />
            <span className="roadmap-track">
              {layout.months.map((month) => (
                <span
                  key={month.key}
                  className="roadmap-month"
                  style={{ left: `${month.left}%` }}
                >
                  {month.label}
                </span>
              ))}
              <span className="roadmap-today-label">오늘</span>
            </span>
          </div>
        )}
        <ol className="roadmap-rows" aria-label="마일스톤 로드맵">
          {items.map(({ milestone, bar, sprints }) => (
            <li key={milestone.id} className="roadmap-row">
              <div className="roadmap-label">
                <button
                  type="button"
                  className="roadmap-name"
                  aria-haspopup="dialog"
                  onClick={() => onOpen(milestone.id)}
                >
                  {milestone.name}
                </button>
                <span className="roadmap-meta">
                  <MilestoneStatusBadge milestone={milestone} />
                  <MilestoneRiskBadge milestone={milestone} />
                  <span>{milestoneDateLabel(milestone)}</span>
                </span>
                {milestone.sprints.length > 0 && (
                  <ul
                    className="roadmap-sprint-list"
                    aria-label="연결 스프린트"
                  >
                    {milestone.sprints.map((sprint) => (
                      <li key={sprint.id}>
                        {sprint.name}
                        <span className="text-muted">
                          {" "}
                          {sprintStatusLabels[sprint.status]}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="roadmap-track" aria-hidden="true">
                {bar && (
                  <span
                    className="roadmap-bar"
                    data-status={milestone.status}
                    title={`${milestone.name} ${milestoneStatusLabels[milestone.status]}`}
                    style={place(bar)}
                    onClick={() => onOpen(milestone.id)}
                  />
                )}
                {sprints.map(({ sprint, span }) => (
                  <span
                    key={sprint.id}
                    className="roadmap-sprint"
                    data-status={sprint.status}
                    title={sprint.name}
                    style={place(span)}
                  >
                    {sprint.name}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
