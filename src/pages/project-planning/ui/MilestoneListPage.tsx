"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  milestoneErrorMessage,
  milestonePercent,
  milestoneQueries,
  type Milestone,
} from "@/entities/milestone";
import { seoulToday } from "@/entities/sprint";
import { normalizeApiError } from "@/shared/api";
import { routes } from "@/shared/config";
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  InfoTip,
  ListSkeleton,
  QueryState,
  SegmentedLinks,
} from "@/shared/ui";
import { useMilestones } from "../api/milestone-actions";
import { milestoneDateLabel } from "../model/roadmap";
import { MilestoneRiskBadge, MilestoneStatusBadge } from "./MilestoneBadges";
import { MilestoneFormDialog } from "./MilestoneFormDialog";
import { MilestonePanel } from "./MilestonePanel";
import { MilestoneRoadmap } from "./MilestoneRoadmap";
import { ProgressBar } from "./ProgressBar";
import { ProjectFrame, type PlanningContext } from "./ProjectFrame";

export function MilestoneListPage({
  projectId,
}: {
  readonly projectId: string;
}) {
  return (
    <ProjectFrame projectId={projectId}>
      {(context) => <Milestones {...context} />}
    </ProjectFrame>
  );
}

/** 기본은 로드맵, `?view=list`는 목록. 상세는 위에 뜨는 패널(`?milestone=`)이고 경로를 만들지 않는다(AGENTS.md). */
function Milestones({ project, manages }: PlanningContext) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const view = search?.get("view") === "list" ? "list" : "roadmap";
  const milestones = useQuery(milestoneQueries.view(project.id, view));
  const actions = useMilestones(project.id);
  const [creating, setCreating] = useState(false);
  const today = seoulToday();
  const here = routes.projectMilestones(project.id);
  // 패널은 이 화면(경로)에서만 연다. 떠난 뒤 숨겨진 이 화면이 보드의 `?milestone=` 필터를
  // 패널 열림으로 읽으면 보이지 않는 모달이 남는다(V-route-focus H1).
  const selectedId = pathname === here ? search?.get("milestone") : null;
  function href(params: URLSearchParams) {
    return `${pathname}${params.size ? `?${params}` : ""}`;
  }
  function select(id: string | null) {
    const params = new URLSearchParams(search?.toString());
    if (id) params.set("milestone", id);
    else params.delete("milestone");
    router.replace(href(params), { scroll: false });
  }
  return (
    <section className="grid gap-5" aria-labelledby="milestones-heading">
      <div className="planning-section-head">
        <h2 className="text-lg font-semibold">
          <span id="milestones-heading">마일스톤</span>{" "}
          <InfoTip label="마일스톤 설명">
            이번 출시에 들어갈 결과물이에요. 스프린트를 연결하면 그 업무가
            진행률에 자동으로 들어가요.
          </InfoTip>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedLinks
            label="마일스톤 보기"
            items={[
              { href: here, label: "로드맵", active: view === "roadmap" },
              {
                href: `${here}?view=list`,
                label: "목록",
                active: view === "list",
              },
            ]}
          />
          {manages && (
            <Button onClick={() => setCreating(true)}>
              <Icon name="plus" className="inline-block" /> 새 마일스톤
            </Button>
          )}
        </div>
      </div>
      <QueryState
        query={milestones}
        skeleton={
          <ListSkeleton
            label="마일스톤 불러오는 중"
            rows={3}
            rowClassName="h-16"
          />
        }
        error={(error, retry) => (
          <ErrorState
            title="마일스톤을 불러오지 못했어요"
            description={milestoneErrorMessage(normalizeApiError(error))}
            onRetry={retry}
          />
        )}
        empty={
          <EmptyState
            title="아직 마일스톤이 없어요"
            description={
              manages
                ? "출시할 결과물을 만들고 스프린트나 업무를 연결해 보세요."
                : "PM 또는 헤드 어드민이 마일스톤을 만들면 여기에 보여요."
            }
          />
        }
      >
        {(list) =>
          view === "list" ? (
            <MilestoneList milestones={list} onOpen={select} />
          ) : (
            <MilestoneRoadmap milestones={list} today={today} onOpen={select} />
          )
        }
      </QueryState>
      {creating && (
        // 닫을 때 내려서 다음에 열면 빈 양식으로 시작한다.
        <MilestoneFormDialog
          projectId={project.id}
          title="새 마일스톤"
          submitLabel="마일스톤 만들기"
          onClose={() => setCreating(false)}
          onSubmit={(input) => actions.create.mutateAsync(input)}
        />
      )}
      {selectedId && (
        <MilestonePanel
          key={selectedId}
          project={project}
          milestoneId={selectedId}
          fallbackTitle={
            milestones.data?.find((item) => item.id === selectedId)?.name
          }
          manages={manages}
          actions={actions}
          onClose={() => select(null)}
          onLeave={() => {
            // 다른 화면으로 가기 전에 지금 기록에서 패널을 닫는다: 뒤로가기로 돌아와도 패널이 다시 뜨지 않는다.
            const params = new URLSearchParams(search?.toString());
            params.delete("milestone");
            window.history.replaceState(null, "", href(params));
          }}
        />
      )}
    </section>
  );
}

function MilestoneList({
  milestones,
  onOpen,
}: {
  readonly milestones: readonly Milestone[];
  readonly onOpen: (id: string) => void;
}) {
  return (
    <ul className="milestone-rows">
      {milestones.map((milestone) => (
        <li key={milestone.id} className="milestone-row">
          <button
            type="button"
            className="milestone-row-name"
            aria-haspopup="dialog"
            onClick={() => onOpen(milestone.id)}
          >
            {milestone.name}
          </button>
          <span className="milestone-row-meta">
            <MilestoneStatusBadge milestone={milestone} />
            <MilestoneRiskBadge milestone={milestone} />
            <span className="milestone-row-due">
              {milestoneDateLabel(milestone)}
            </span>
          </span>
          <ProgressBar
            done={milestone.progress.done}
            total={milestone.progress.total}
            percent={milestonePercent(milestone.progress)}
            label={`${milestone.name} 진행률`}
          />
        </li>
      ))}
    </ul>
  );
}
