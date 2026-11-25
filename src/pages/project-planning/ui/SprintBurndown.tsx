"use client";

import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ProjectDetail } from "@/entities/project";
import {
  sprintErrorMessage,
  sprintQueries,
  type Burndown,
  type Sprint,
} from "@/entities/sprint";
import { normalizeApiError } from "@/shared/api";
import { formatDate } from "@/shared/lib";
import { EmptyState, ErrorState, Skeleton, StaleNotice } from "@/shared/ui";
import { burndownPoints, burndownRows } from "../model/burndown";

const shortDate = (value: string) => formatDate(value, { year: undefined });
const path = (points: readonly { x: number; y: number }[]) =>
  points
    .map(
      (point, index) =>
        `${index ? "L" : "M"}${(point.x * 100).toFixed(2)} ${((1 - point.y) * 100).toFixed(2)}`,
    )
    .join(" ");

/**
 * 번다운: 남은 양(실선)과 이상선(점선). 기준(크기 합계, 업무 수)은 서버 basis(D14-i).
 * 차트와 표는 같은 높이의 상자 안에서 바꿔 본다(본문을 밀지 않는다).
 */
export function SprintBurndown({
  project,
  sprint,
}: {
  readonly project: ProjectDetail;
  readonly sprint: Sprint;
}) {
  const id = useId();
  const [view, setView] = useState<"chart" | "table">("chart");
  const burndown = useQuery(sprintQueries.burndown(project.id, sprint.id));
  const data = burndown.data;
  const unit = data?.basis === "COUNT" ? "개" : "";
  return (
    <section className="grid gap-2" aria-labelledby={`${id}-title`}>
      <div className="plan-pane-head">
        <h3 id={`${id}-title`} className="planning-subhead">
          번다운
          <span className="burndown-basis">
            {data
              ? data.basis === "WEIGHT"
                ? "기준: 크기 합계"
                : "기준: 업무 수(모두 크기 미정)"
              : " "}
          </span>
        </h3>
        <div className="ui-segmented" role="group" aria-label="번다운 보기">
          {(["chart", "table"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className="ui-segmented-option"
              aria-pressed={view === value}
              onClick={() => setView(value)}
            >
              {value === "chart" ? "차트" : "표"}
            </button>
          ))}
        </div>
      </div>
      <StaleNotice query={burndown} />
      <div
        className="burndown-box"
        aria-busy={burndown.isFetching || undefined}
      >
        {burndown.isPending ? (
          <Skeleton className="h-full" />
        ) : !data ? (
          <ErrorState
            description={sprintErrorMessage(normalizeApiError(burndown.error))}
            onRetry={() => void burndown.refetch()}
          />
        ) : data.days.length === 0 ? (
          <EmptyState
            title="아직 기록이 없습니다"
            description="진행 중인 스프린트는 하루에 한 번 남은 양을 기록합니다."
          />
        ) : view === "table" ? (
          <div className="burndown-table-wrap">
            <table className="burndown-table">
              <caption className="sr-only">
                날짜별 남은 양과 이상선{unit && "(업무 수)"}
              </caption>
              <thead>
                <tr>
                  <th scope="col">날짜</th>
                  <th scope="col">남음</th>
                  <th scope="col">이상</th>
                </tr>
              </thead>
              <tbody>
                {burndownRows(data).map((row) => (
                  <tr key={row.date}>
                    <th scope="row">{shortDate(row.date)}</th>
                    <td className="tabular-nums">
                      {row.remaining ?? "–"}
                      {row.remaining !== null && unit}
                    </td>
                    <td className="tabular-nums">
                      {row.ideal === null ? "–" : `${row.ideal}${unit}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <BurndownChart sprint={sprint} data={data} unit={unit} />
        )}
      </div>
    </section>
  );
}

function BurndownChart({
  sprint,
  data,
  unit,
}: {
  readonly sprint: Sprint;
  readonly data: Burndown;
  readonly unit: string;
}) {
  const points = burndownPoints(data, sprint);
  const last = points.remaining.at(-1);
  return (
    <figure className="burndown-chart">
      <figcaption className="burndown-legend">
        <span>
          <span className="burndown-swatch" data-line="remaining" />
          남음
          {last && (
            <span className="tabular-nums">
              {" "}
              {last.value}
              {unit}
            </span>
          )}
        </span>
        <span>
          <span className="burndown-swatch" data-line="ideal" />
          이상선
        </span>
      </figcaption>
      <div className="burndown-plot">
        <span className="burndown-y" aria-hidden="true">
          {points.max}
          {unit}
        </span>
        {/* 표 보기가 같은 값을 읽어 주므로 그림은 보조 설명만 둔다. */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          aria-label={`번다운: 남은 양 ${last?.value ?? 0}${unit}, 시작 ${points.max}${unit}. 값은 표 보기에서 읽을 수 있습니다.`}
        >
          <line x1="0" y1="100" x2="100" y2="100" className="burndown-axis" />
          <path d={path(points.ideal)} className="burndown-ideal" />
          <path d={path(points.remaining)} className="burndown-remaining" />
        </svg>
      </div>
      <div className="burndown-x" aria-hidden="true">
        <span>{shortDate(sprint.startDate)}</span>
        <span>{shortDate(sprint.endDate)}</span>
      </div>
    </figure>
  );
}
