import Link from "next/link";
import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  milestoneErrorMessage,
  milestonePercent,
  milestoneInput,
  milestoneQueries,
  milestoneStatusLabels,
  type Milestone,
} from "@/entities/milestone";
import type { ProjectDetail } from "@/entities/project";
import { sprintQueries, sprintStatusLabels } from "@/entities/sprint";
import { isGoneError, taskQueries } from "@/entities/task";
import { normalizeApiError } from "@/shared/api";
import { routes } from "@/shared/config";
import { formatDate } from "@/shared/lib";
import {
  Button,
  Dialog,
  ErrorState,
  Markdown,
  Select,
  StaleNotice,
} from "@/shared/ui";
import type { useMilestones } from "../api/milestone-actions";
import { formatRange } from "../model/dates";
import { milestoneDateLabel } from "../model/roadmap";
import { boardTasks } from "../model/sprint-tasks";
import { MilestoneFormDialog } from "./MilestoneFormDialog";
import { MilestoneReleaseDialog } from "./MilestoneReleaseDialog";
import { MilestoneRiskBadge, MilestoneStatusBadge } from "./MilestoneBadges";
import { ProgressBar } from "./ProgressBar";
import { TaskRow } from "./TaskRow";

type Actions = ReturnType<typeof useMilestones>;

/** 목록 위에 뜨는 상세(`?milestone=`). 상세 조회에만 릴리스 PR 목록이 실린다. */
export function MilestonePanel({
  project,
  milestoneId,
  fallbackTitle,
  manages,
  actions,
  onClose,
  onLeave,
}: {
  readonly project: ProjectDetail;
  readonly milestoneId: string;
  /** 상세가 오기 전 제목 자리(목록에서 아는 이름). */
  readonly fallbackTitle?: string;
  readonly manages: boolean;
  readonly actions: Actions;
  readonly onClose: () => void;
  readonly onLeave: () => void;
}) {
  const detail = useQuery(milestoneQueries.detail(project.id, milestoneId));
  const [mode, setMode] = useState<"view" | "edit" | "release">("view");
  const milestone = detail.data;
  if (milestone && mode === "edit")
    return (
      <MilestoneFormDialog
        projectId={project.id}
        title="마일스톤 수정"
        submitLabel="변경 저장"
        initial={milestone}
        onClose={() => setMode("view")}
        onSubmit={(input) =>
          actions.update.mutateAsync({
            id: milestone.id,
            input,
            previous: milestoneInput(milestone),
          })
        }
      />
    );
  if (milestone && mode === "release")
    return (
      <MilestoneReleaseDialog
        milestone={milestone}
        onClose={() => setMode("view")}
        onSubmit={(input) =>
          actions.update.mutateAsync({
            id: milestone.id,
            input,
            previous: milestoneInput(milestone),
          })
        }
      />
    );
  return (
    <Dialog
      open
      onClose={onClose}
      title={milestone?.name ?? fallbackTitle ?? "마일스톤"}
      className="milestone-panel"
    >
      {milestone ? (
        <div className="grid gap-6" aria-busy={detail.isFetching || undefined}>
          <StaleNotice query={detail} />
          <MilestoneBody
            project={project}
            milestone={milestone}
            manages={manages}
            actions={actions}
            onEditRelease={() => setMode("release")}
          />
          <MilestoneFooter
            project={project}
            milestone={milestone}
            manages={manages}
            actions={actions}
            onEdit={() => setMode("edit")}
            onClose={onClose}
            onLeave={onLeave}
          />
        </div>
      ) : detail.isPending ? (
        <div
          className="milestone-panel-skeleton"
          role="status"
          aria-label="마일스톤 불러오는 중"
        >
          <span className="ui-skeleton-text">상태 진행 계획 지연 위험</span>
          <span className="ui-skeleton-text">기간 11월 1일 – 12월 20일</span>
          <span className="ui-skeleton-text">진행 0/0 0%</span>
          <span className="ui-skeleton-text">기획 문서 없음</span>
        </div>
      ) : (
        <ErrorState
          title={
            isGoneError(detail.error)
              ? "찾는 마일스톤이 없어요"
              : "마일스톤을 불러오지 못했어요"
          }
          description={milestoneErrorMessage(normalizeApiError(detail.error))}
          onRetry={() => void detail.refetch()}
        />
      )}
    </Dialog>
  );
}

function MilestoneBody({
  project,
  milestone,
  manages,
  actions,
  onEditRelease,
}: {
  readonly project: ProjectDetail;
  readonly milestone: Milestone;
  readonly manages: boolean;
  readonly actions: Actions;
  readonly onEditRelease: () => void;
}) {
  const { progress } = milestone;
  return (
    <>
      <dl className="milestone-facts">
        <div>
          <dt>상태</dt>
          <dd className="flex flex-wrap items-center gap-2">
            <MilestoneStatusBadge milestone={milestone} />
            <MilestoneRiskBadge milestone={milestone} />
            <span className="text-xs text-muted">
              {milestone.statusSource === "MANUAL"
                ? `수동 지정 (자동 계산은 ${milestoneStatusLabels[milestone.autoStatus]})`
                : "자동 계산"}
            </span>
          </dd>
        </div>
        {milestone.risk.reason && (
          <div>
            <dt>위험 이유</dt>
            <dd>{milestone.risk.reason}</dd>
          </div>
        )}
        <div>
          <dt>기간</dt>
          <dd>{milestoneDateLabel(milestone)}</dd>
        </div>
        <div>
          <dt>진행</dt>
          <dd className="grid gap-1">
            <ProgressBar
              done={progress.done}
              total={progress.total}
              percent={milestonePercent(progress)}
              label={`${milestone.name} 진행률`}
            />
            {progress.totalWeight > 0 && (
              <span className="text-xs text-muted tabular-nums">
                크기 기준 {progress.doneWeight}/{progress.totalWeight}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>기획 문서</dt>
          <dd>
            {milestone.specDocument ? (
              <Link
                href={routes.doc(milestone.specDocument.id)}
                className="hover:underline"
              >
                {milestone.specDocument.kind} {milestone.specDocument.title}
              </Link>
            ) : (
              <span className="text-muted">없음</span>
            )}
          </dd>
        </div>
      </dl>
      <p className="planning-note">
        진행률에는 연결한 스프린트의 업무와 직접 연결한 업무가 함께 들어가요. 두
        곳에 모두 걸린 업무도 한 번만 들어가고, 내가 볼 수 있는 업무만 반영돼요.
      </p>
      {milestone.goal && (
        <section className="grid gap-2" aria-label="목표">
          <h3 className="planning-subhead">목표</h3>
          <Markdown>{milestone.goal}</Markdown>
        </section>
      )}
      {milestone.description && (
        <section className="grid gap-2" aria-label="설명">
          <h3 className="planning-subhead">설명</h3>
          <Markdown>{milestone.description}</Markdown>
        </section>
      )}
      <LinkedSprints
        projectId={project.id}
        milestone={milestone}
        manages={manages}
        actions={actions}
      />
      <LinkedTasks project={project} milestone={milestone} />
      <LinkedRelease
        milestone={milestone}
        manages={manages}
        onEdit={onEditRelease}
      />
    </>
  );
}

function LinkedSprints({
  projectId,
  milestone,
  manages,
  actions,
}: {
  readonly projectId: string;
  readonly milestone: Milestone;
  readonly manages: boolean;
  readonly actions: Actions;
}) {
  const id = useId();
  const sprints = useQuery({
    ...sprintQueries.list(projectId),
    enabled: manages,
  });
  const [choice, setChoice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const linkedIds = new Set(milestone.sprints.map((sprint) => sprint.id));
  const candidates = (sprints.data ?? []).filter(
    (sprint) => !linkedIds.has(sprint.id),
  );
  const busy = actions.sprint.isPending;
  function change(sprintId: string, linked: boolean) {
    setError(null);
    actions.sprint.mutate(
      { milestoneId: milestone.id, sprintId, linked },
      {
        onSuccess: () => setChoice(""),
        onError: (cause) =>
          setError(milestoneErrorMessage(normalizeApiError(cause))),
      },
    );
  }
  return (
    <section className="grid gap-3" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="planning-subhead">
        연결 스프린트
        <span className="tabular-nums">{milestone.sprints.length}</span>
      </h3>
      {milestone.sprints.length > 0 ? (
        <ul className="milestone-links">
          {milestone.sprints.map((sprint) => (
            <li key={sprint.id}>
              <Link
                href={routes.projectSprint(projectId, sprint.id)}
                className="milestone-link-main"
              >
                {sprint.name}
              </Link>
              <span className="milestone-link-meta">
                {formatRange(sprint.startDate, sprint.endDate)}{" "}
                {sprintStatusLabels[sprint.status]}
              </span>
              {manages && (
                <Button
                  variant="ghost"
                  className="ui-button-sm"
                  aria-disabled={busy}
                  aria-label={`${sprint.name} 연결 해제`}
                  onClick={() => !busy && change(sprint.id, false)}
                >
                  해제
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          연결한 스프린트가 없어요. 스프린트를 연결하면 그 업무가 진행률에
          들어가요.
        </p>
      )}
      {manages && (
        <div className="milestone-link-add">
          <Select
            aria-label="연결할 스프린트"
            value={choice}
            onChange={(event) => setChoice(event.target.value)}
            disabled={busy}
          >
            <option value="">
              {sprints.isPending ? "스프린트 불러오는 중" : "스프린트 고르기"}
            </option>
            {candidates.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name} ({sprintStatusLabels[sprint.status]})
              </option>
            ))}
          </Select>
          <Button
            variant="secondary"
            className="ui-button-sm"
            disabled={!choice}
            loading={busy && !!choice}
            onClick={() => change(choice, true)}
          >
            연결
          </Button>
          <p className="planning-note w-full">
            다른 마일스톤에 연결된 스프린트를 고르면 이 마일스톤으로 옮겨요.
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}

/** 업무에서 이 마일스톤을 직접 지정한 업무(보드 milestone 필터는 직접 연결만 본다, 계약 8절). */
function LinkedTasks({
  project,
  milestone,
}: {
  readonly project: ProjectDetail;
  readonly milestone: Milestone;
}) {
  const id = useId();
  const search = new URLSearchParams({
    project: project.key,
    milestone: milestone.id,
  }).toString();
  const board = useQuery(taskQueries.board(search, false));
  const tasks = boardTasks(board.data);
  return (
    <section className="grid gap-3" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="planning-subhead">
        직접 연결 업무
        <span className="tabular-nums">
          {board.isPending ? "" : tasks.length}
        </span>
      </h3>
      {board.isPending ? (
        <div className="milestone-task-skeleton" aria-hidden="true">
          <span className="ui-skeleton-text">업무 불러오는 중</span>
        </div>
      ) : board.isError && !board.data ? (
        <p className="text-sm text-muted">업무를 불러오지 못했어요.</p>
      ) : tasks.length ? (
        <ul className="plan-list" aria-label="직접 연결 업무">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          직접 연결한 업무가 없어요. 업무 상세에서 이 마일스톤을 지정할 수
          있어요.
        </p>
      )}
    </section>
  );
}

function LinkedRelease({
  milestone,
  manages,
  onEdit,
}: {
  readonly milestone: Milestone;
  readonly manages: boolean;
  readonly onEdit: () => void;
}) {
  const id = useId();
  const { releaseLink: link, release } = milestone;
  const autoDone =
    !!release &&
    milestone.statusSource === "AUTO" &&
    milestone.status === "DONE";
  return (
    <section className="grid gap-3" aria-labelledby={`${id}-title`}>
      <div className="planning-section-head">
        <h3 id={`${id}-title`} className="planning-subhead">
          릴리스
        </h3>
        {manages && (
          <Button variant="ghost" className="ui-button-sm" onClick={onEdit}>
            {link ? "바꾸기" : "연결"}
          </Button>
        )}
      </div>
      {!link ? (
        <p className="text-sm text-muted">
          연결한 릴리스가 없어요. 저장소와 태그를 연결하면 릴리스가 게시될 때
          자동으로 완료돼요.
        </p>
      ) : !release ? (
        <p className="text-sm">
          <span className="font-mono">{link.repositoryFullName}</span>{" "}
          {link.tag}
          <span className="block text-muted">
            이 태그의 릴리스가 아직 게시되지 않았어요. 게시되면 자동으로
            완료돼요.
          </span>
        </p>
      ) : (
        <div className="milestone-release">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <a
              href={release.url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold hover:underline"
            >
              {release.name ?? release.tag}
            </a>
            <span className="text-xs text-muted">
              {link.repositoryFullName}{" "}
              {release.name &&
                release.name !== release.tag &&
                `${release.tag} `}
              {formatDate(release.publishedAt)} 게시
            </span>
          </p>
          {autoDone && (
            <p className="text-sm text-muted">
              릴리스가 게시되어 자동으로 완료됐어요.
            </p>
          )}
          <ReleaseItems release={release} />
        </div>
      )}
    </section>
  );
}

function ReleaseItems({
  release,
}: {
  readonly release: NonNullable<Milestone["release"]>;
}) {
  if (release.itemsStatus === "PENDING")
    return <p className="text-sm text-muted">PR 목록을 계산하는 중이에요.</p>;
  if (release.itemsStatus === "FAILED")
    return <p className="text-sm text-muted">PR 목록을 만들지 못했어요.</p>;
  if (release.itemsStatus === "NO_BASE")
    return (
      <p className="text-sm text-muted">
        이전 릴리스가 없어 포함된 PR을 계산하지 않았어요.
      </p>
    );
  const items = release.items ?? [];
  if (!items.length)
    return <p className="text-sm text-muted">포함된 PR이 없어요.</p>;
  return (
    <>
      <ul className="milestone-links" aria-label="포함된 PR">
        {items.map((item) => (
          <li key={item.number}>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="milestone-link-main"
            >
              <span className="font-mono text-xs text-muted">
                #{item.number}
              </span>{" "}
              {item.title}
            </a>
            {item.mergedAt && (
              <span className="milestone-link-meta">
                {formatDate(item.mergedAt, { year: undefined })} 병합
              </span>
            )}
          </li>
        ))}
      </ul>
      {release.itemsStatus === "TRUNCATED" && (
        <p className="planning-note">PR이 많아 일부만 보여 줘요.</p>
      )}
    </>
  );
}

function MilestoneFooter({
  project,
  milestone,
  manages,
  actions,
  onEdit,
  onClose,
  onLeave,
}: {
  readonly project: ProjectDetail;
  readonly milestone: Milestone;
  readonly manages: boolean;
  readonly actions: Actions;
  readonly onEdit: () => void;
  readonly onClose: () => void;
  readonly onLeave: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {deleting ? (
        <div className="milestone-confirm" role="group" aria-label="삭제 확인">
          <p className="text-sm">
            삭제하면 스프린트와 업무는 그대로 두고 연결만 풀어요.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              disabled={actions.remove.isPending}
              onClick={() => setDeleting(false)}
            >
              취소
            </Button>
            <Button
              variant="danger"
              loading={actions.remove.isPending}
              onClick={() =>
                actions.remove.mutate(milestone.id, {
                  onSuccess: onClose,
                  onError: (cause) => {
                    setDeleting(false);
                    setError(milestoneErrorMessage(normalizeApiError(cause)));
                  },
                })
              }
            >
              삭제
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`${routes.project(project.id)}?milestone=${encodeURIComponent(milestone.id)}`}
            onClick={onLeave}
            className="ui-button ui-button-secondary ui-button-sm"
          >
            보드에서 보기
          </Link>
          {manages && (
            <span className="ml-auto flex flex-wrap gap-2">
              <Button
                variant="secondary"
                className="ui-button-sm"
                onClick={onEdit}
              >
                수정
              </Button>
              <Button
                variant="ghost"
                className="ui-button-sm"
                onClick={() => setDeleting(true)}
              >
                삭제
              </Button>
            </span>
          )}
        </div>
      )}
    </>
  );
}
