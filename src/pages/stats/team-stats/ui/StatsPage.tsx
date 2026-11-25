"use client";

import Link from "next/link";
import { Suspense, useId, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { projectQueries, stageLabels } from "@/entities/project";
import { AuthGuard } from "@/features/auth";
import { routes } from "@/shared/config";
import {
  Badge,
  ChipSelect,
  EmptyState,
  ListSkeleton,
  PageHeader,
  PageSkeleton,
  QueryState,
  SegmentedLinks,
} from "@/shared/ui";
import { statsQueries } from "../api/stats";
import {
  DEFAULT_RANGE,
  formatHours,
  formatNumber,
  formatRate,
  parseRange,
  ranges,
  statsErrorMessage,
  weekLabel,
  weeklySummary,
} from "../model/format";
import type { StatsRange, TeamStats, WeekCount } from "../model/types";

type Scope = "team" | "me";

export function StatsPage() {
  return (
    <AuthGuard require="work">
      {() => (
        <Suspense fallback={<PageSkeleton label="통계 불러오는 중" />}>
          <StatsContent />
        </Suspense>
      )}
    </AuthGuard>
  );
}

function StatsContent() {
  const router = useRouter();
  const pathname = usePathname() ?? routes.stats;
  const search = useSearchParams();
  const scope: Scope = search?.get("view") === "me" ? "me" : "team";
  const range = parseRange(search?.get("range"));
  const projectId = search?.get("project") ?? "";
  // 필터는 아카이브 포함(D18-d). 목록 순서는 서버 순서 그대로.
  const projects = useQuery(projectQueries.list(true));
  const href = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(search?.toString());
    for (const [key, value] of Object.entries(next))
      if (value === null) params.delete(key);
      else params.set(key, value);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
  return (
    <div className="grid gap-5">
      <PageHeader
        title="통계"
        subtitle={
          scope === "me"
            ? "나만 보여요. 다른 팀원은 이 숫자를 볼 수 없습니다."
            : "팀 전체의 흐름입니다. 사람별 숫자는 없습니다."
        }
      />
      <div className="page-toolbar">
        <SegmentedLinks
          label="통계 범위"
          items={[
            {
              href: href({ view: null }),
              label: "팀 전체",
              active: scope === "team",
            },
            {
              href: href({ view: "me" }),
              label: "내 통계 (나만 보여요)",
              active: scope === "me",
            },
          ]}
        />
        <SegmentedLinks
          label="기간"
          items={ranges.map((item) => ({
            href: href({
              range: item.value === DEFAULT_RANGE ? null : item.value,
            }),
            label: item.label,
            active: item.value === range,
          }))}
        />
        <ChipSelect
          label="프로젝트"
          value={projectId}
          options={[
            { value: "", label: "프로젝트 전체" },
            ...(projects.data ?? []).map((project) => ({
              value: project.id,
              label: project.archived
                ? `${project.name} (아카이브)`
                : project.name,
            })),
          ]}
          onChange={(value) => router.replace(href({ project: value || null }))}
        />
      </div>
      {/* 팀과 나는 다른 조회다. key 로 다시 만들어 한쪽 숫자가 다른 쪽 자리에 남지 않게 한다. */}
      <StatsBody
        key={scope}
        scope={scope}
        range={range}
        projectId={projectId}
      />
    </div>
  );
}

function StatsBody({
  scope,
  range,
  projectId,
}: {
  readonly scope: Scope;
  readonly range: StatsRange;
  readonly projectId: string;
}) {
  const stats = useQuery(statsQueries.stats(scope, range, projectId));
  return (
    <QueryState
      query={stats}
      isEmpty={() => false}
      empty={null}
      skeleton={
        <ListSkeleton label="통계를 불러오는 중" rows={5} rowClassName="h-28" />
      }
      errorMessage={statsErrorMessage}
    >
      {(data) => (
        <div className="stats-page">
          {data.flow.cycleTime.approximateCount > 0 && (
            <p className="stats-notice" role="note">
              상태 기록을 시작하기 전에 진행을 시작한 업무{" "}
              {data.flow.cycleTime.approximateCount}개는 만든 시각부터 계산해
              사이클 타임이 실제보다 길게 나올 수 있습니다. 그 전의 리뷰 대기와
              막힘은 일부 빠져 있습니다.
            </p>
          )}
          <FlowSection stats={data} />
          <SprintSection stats={data} />
          {scope === "team" && <OpsSection stats={data} />}
          {scope === "team" && data.projects && (
            <ProjectSection projects={data.projects} />
          )}
          <p className="planning-note">
            숫자는 최대 1분 늦게 반영됩니다. 비공개 원본 업무와 비공개 저장소
            배포는 세지 않습니다.
          </p>
        </div>
      )}
    </QueryState>
  );
}

function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  const id = useId();
  return (
    <section className="stats-section" aria-labelledby={id}>
      <h2 id={id} className="stats-section-title">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  detail,
  help,
}: {
  readonly label: string;
  readonly value: string;
  readonly detail?: string;
  readonly help: string;
}) {
  return (
    <div className="stats-metric">
      <dt>{label}</dt>
      <dd className="stats-metric-value">{value}</dd>
      <dd className="stats-metric-detail">{detail ?? " "}</dd>
      <dd className="stats-metric-help">{help}</dd>
    </div>
  );
}

function FlowSection({ stats }: { readonly stats: TeamStats }) {
  const { flow } = stats;
  return (
    <Section title="업무 흐름">
      <dl className="stats-metrics">
        <Metric
          label="완료"
          value={`${flow.completedCount}개`}
          help="이 기간에 완료한 업무 수"
        />
        <Metric
          label="사이클 타임"
          value={formatHours(flow.cycleTime.medianHours)}
          detail={`중앙값, 느린 쪽 25% 경계 ${formatHours(flow.cycleTime.p75Hours)}, 표본 ${flow.cycleTime.sampleCount}개`}
          help="진행 중에서 완료까지 걸린 시간"
        />
        <Metric
          label="리뷰 대기"
          value={formatHours(flow.reviewWait.medianHours)}
          detail={`중앙값, 표본 ${flow.reviewWait.sampleCount}개`}
          help="리뷰에 올린 뒤 다음 단계로 넘어가기까지 걸린 시간"
        />
        <Metric
          label="막힘 비율"
          value={formatRate(flow.blocked.share)}
          detail={`${flow.blocked.taskCount}개 중 ${flow.blocked.blockedTaskCount}개, 막힌 시간 ${formatHours(flow.blocked.totalHours)}`}
          help="기간 중 한 번이라도 막힌 업무의 비율"
        />
        <Metric
          label="진행 중"
          value={`${flow.wip}개`}
          help="지금 진행 중인 업무 수(WIP)"
        />
      </dl>
      <WeekBars title="주별 완료" weeks={flow.completedPerWeek} unit="개" />
    </Section>
  );
}

function SprintSection({ stats }: { readonly stats: TeamStats }) {
  const { sprints, averages } = stats.sprint;
  const top = Math.max(1, ...sprints.map((item) => item.velocity));
  return (
    <Section title="스프린트">
      {sprints.length === 0 ? (
        <EmptyState
          title="끝난 스프린트가 없습니다"
          description="이 기간에 종료한 스프린트가 생기면 완료율과 속도가 보입니다."
        />
      ) : (
        <div className="stats-table-wrap">
          <table className="sprint-trend-table stats-sprint-table">
            <caption className="sr-only">
              이 기간에 종료한 스프린트, 오래된 것부터
            </caption>
            <thead>
              <tr>
                <th scope="col">스프린트</th>
                <th scope="col">종료</th>
                <th scope="col">완료율</th>
                <th scope="col">속도</th>
                <th scope="col">이월</th>
              </tr>
            </thead>
            <tbody>
              {sprints.map((item) => (
                <tr key={item.id}>
                  <th scope="row">
                    <Link
                      href={routes.projectSprint(item.projectId, item.id)}
                      className="hover:underline"
                    >
                      {item.name}
                    </Link>
                  </th>
                  <td>{weekLabel(item.closedAt.slice(0, 10))}</td>
                  <td>
                    {formatRate(item.completionRate)}
                    <span className="text-muted">
                      {" "}
                      {item.doneCount}/{item.plannedCount}
                    </span>
                  </td>
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
                  <td>
                    {formatRate(item.carryOverRate)}
                    <span className="text-muted"> {item.carryOverCount}개</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">평균</th>
                <td />
                <td>{formatRate(averages.completionRate)}</td>
                <td>{formatNumber(averages.velocity)}</td>
                <td>{formatRate(averages.carryOverRate)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <ul className="stats-help-list">
        <li>완료율: 스프린트에 넣은 업무 중 완료한 비율</li>
        <li>속도: 완료한 크기 합계(S=1, M=2, L=4, XL=8)</li>
        <li>이월: 끝내지 못해 다음으로 넘긴 업무의 비율</li>
      </ul>
    </Section>
  );
}

function OpsSection({ stats }: { readonly stats: TeamStats }) {
  const { ops } = stats;
  return (
    <Section title="운영">
      {!ops ? (
        <p className="planning-note">
          장애와 배포는 조직 단위라 프로젝트를 고르면 보이지 않습니다.
        </p>
      ) : (
        <>
          <dl className="stats-metrics">
            <Metric
              label="장애"
              value={`${ops.incidentCount}건`}
              help="이 기간에 시작한 장애 수"
            />
            <Metric
              label="평균 완화 시간"
              value={formatHours(ops.meanTimeToMitigateHours)}
              detail="MTTM"
              help="장애 시작부터 영향을 멈출 때까지 걸린 시간"
            />
            <Metric
              label="평균 해결 시간"
              value={formatHours(ops.meanTimeToResolveHours)}
              detail="MTTR"
              help="장애 시작부터 해결까지 걸린 시간"
            />
            <Metric
              label="배포"
              value={`${ops.deployCount}회`}
              help="운영 환경에 성공한 배포 수"
            />
          </dl>
          <div className="stats-charts">
            <WeekBars
              title="주별 장애"
              weeks={ops.incidentsPerWeek}
              unit="건"
            />
            <WeekBars title="주별 배포" weeks={ops.deploysPerWeek} unit="회" />
          </div>
        </>
      )}
    </Section>
  );
}

function ProjectSection({
  projects,
}: {
  readonly projects: NonNullable<TeamStats["projects"]>;
}) {
  return (
    <Section title="프로젝트 진행">
      {projects.length === 0 ? (
        <EmptyState title="진행 중인 프로젝트가 없습니다" />
      ) : (
        <ul className="list">
          {projects.map((project) => {
            const { milestones } = project;
            const percent = milestones.taskTotal
              ? Math.floor((milestones.taskDone / milestones.taskTotal) * 100)
              : 0;
            return (
              <li key={project.id} className="list-row stats-project-row">
                <Link
                  href={routes.projectMilestones(project.id)}
                  className="list-row-main"
                >
                  <span className="list-row-key">{project.key}</span>
                  <span className="list-row-title">{project.name}</span>
                </Link>
                <Badge>{stageLabels[project.stage]}</Badge>
                <span className="stats-project-meta">
                  마일스톤 {milestones.total}개, 진행 중 {milestones.inProgress}
                  , 완료 {milestones.done}
                  {milestones.delayed > 0 && (
                    <Badge className="badge-red">
                      지연 {milestones.delayed}
                    </Badge>
                  )}
                </span>
                <span className="planning-progress">
                  <span
                    role="meter"
                    aria-label={`${project.name} 마일스톤 업무 진행`}
                    aria-valuemin={0}
                    aria-valuemax={milestones.taskTotal}
                    aria-valuenow={milestones.taskDone}
                    aria-valuetext={`${milestones.taskTotal}개 중 ${milestones.taskDone}개 완료, ${percent}%`}
                    className="planning-progress-track"
                  >
                    <span
                      className="planning-progress-fill"
                      style={{ transform: `scaleX(${percent / 100})` }}
                    />
                  </span>
                  <span className="planning-progress-text tabular-nums">
                    {milestones.taskDone}/{milestones.taskTotal}
                    <span className="text-muted"> {percent}%</span>
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="planning-note">
        진행은 마일스톤에 묶인 업무 기준이라 마일스톤 화면과 같은 숫자입니다.
      </p>
    </Section>
  );
}

/** 주별 막대. 막대는 장식이고 글 요약과 화면 낭독용 표가 같은 숫자를 전한다. */
function WeekBars({
  title,
  weeks,
  unit,
}: {
  readonly title: string;
  readonly weeks: readonly WeekCount[];
  readonly unit: string;
}) {
  const top = Math.max(1, ...weeks.map((week) => week.count));
  const first = weeks[0];
  const last = weeks.at(-1);
  return (
    <figure className="stats-chart">
      <figcaption className="planning-subhead">{title}</figcaption>
      <div className="stats-bars" aria-hidden="true">
        {weeks.map((week) => (
          <span
            key={week.weekStart}
            className="stats-bar"
            title={`${weekLabel(week.weekStart)} 주 ${week.count}${unit}`}
            style={{ "--bar-ratio": week.count / top } as CSSProperties}
          />
        ))}
      </div>
      <div className="stats-bars-axis" aria-hidden="true">
        <span>{first ? weekLabel(first.weekStart) : ""}</span>
        <span>{last ? weekLabel(last.weekStart) : ""}</span>
      </div>
      <p className="planning-note">{weeklySummary(weeks, unit)}</p>
      <table className="sr-only">
        <caption>{title}, 오래된 주부터</caption>
        <thead>
          <tr>
            <th scope="col">주 시작</th>
            <th scope="col">수</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.weekStart}>
              <th scope="row">{weekLabel(week.weekStart)}</th>
              <td>
                {week.count}
                {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
