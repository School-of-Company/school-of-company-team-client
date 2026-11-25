"use client";

import Link from "next/link";
import { useId, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { sprintErrorMessage, sprintQueries } from "@/entities/sprint";
import { normalizeApiError } from "@/shared/api";
import { routes } from "@/shared/config";
import { ErrorState, Skeleton, StaleNotice } from "@/shared/ui";
import { percent } from "../model/goal-items";

const LIMIT = 6;
const rate = (value: number | null) =>
  value === null ? "–" : `${percent(value)}%`;
const round = (value: number | null) =>
  value === null ? "–" : String(Math.round(value * 10) / 10);

/**
 * 최근 종료 스프린트 비교(D14-k): 속도(완료 크기), 완료율, 이월, 목표 달성률과 평균.
 * 줄 수를 종료 스프린트 수로 미리 정해 대기 자리와 결과의 높이를 맞춘다.
 */
export function SprintTrend({
  projectId,
  closedCount,
}: {
  readonly projectId: string;
  readonly closedCount: number;
}) {
  const headingId = useId();
  const stats = useQuery(sprintQueries.stats(projectId, LIMIT));
  const rows = Math.min(closedCount, LIMIT);
  const style = { "--trend-rows": rows } as CSSProperties;
  const data = stats.data;
  const top = Math.max(
    1,
    ...(data?.sprints.map((item) => item.velocity) ?? []),
  );
  return (
    <section className="grid gap-2" aria-labelledby={headingId}>
      <h3 id={headingId} className="planning-subhead">
        최근 스프린트 비교 <span className="tabular-nums">최근 {rows}개</span>
      </h3>
      <StaleNotice query={stats} />
      <div className="sprint-trend" style={style}>
        {stats.isPending ? (
          <Skeleton className="h-full" />
        ) : !data ? (
          <ErrorState
            description={sprintErrorMessage(normalizeApiError(stats.error))}
            onRetry={() => void stats.refetch()}
          />
        ) : (
          <table className="sprint-trend-table">
            <caption className="sr-only">
              최근 종료 스프린트 지표, 오래된 것부터
            </caption>
            <thead>
              <tr>
                <th scope="col">스프린트</th>
                <th scope="col">속도</th>
                <th scope="col">완료율</th>
                <th scope="col">이월</th>
                <th scope="col">목표</th>
              </tr>
            </thead>
            <tbody>
              {data.sprints.map((item) => (
                <tr key={item.id}>
                  <th scope="row">
                    <Link
                      href={routes.projectSprint(projectId, item.id)}
                      className="hover:underline"
                    >
                      {item.name}
                    </Link>
                  </th>
                  <td>
                    <span className="sprint-trend-velocity">
                      <span
                        className="sprint-trend-bar"
                        aria-hidden="true"
                        style={
                          {
                            "--trend-ratio": item.velocity / top,
                          } as CSSProperties
                        }
                      />
                      {item.velocity}
                    </span>
                  </td>
                  <td>{rate(item.completionRate)}</td>
                  <td>{item.carryOverCount}</td>
                  <td>{rate(item.goalAchievedRate)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">평균</th>
                <td>{round(data.averages.velocity)}</td>
                <td>{rate(data.averages.completionRate)}</td>
                <td>{round(data.averages.carryOverCount)}</td>
                <td>{rate(data.averages.goalAchievedRate)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
      <p className="planning-note">
        속도는 완료한 크기 합계(S=1, M=2, L=4, XL=8)입니다.
      </p>
    </section>
  );
}
