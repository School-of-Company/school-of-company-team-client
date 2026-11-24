"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  milestoneErrorMessage,
  milestoneOverdue,
  milestoneQueries,
  type Milestone,
  type MilestoneInput,
} from "@/entities/milestone";
import { seoulToday } from "@/entities/sprint";
import { fieldErrors, normalizeApiError } from "@/shared/api";
import { routes } from "@/shared/config";
import { formatDate } from "@/shared/lib";
import {
  Button,
  DatePicker,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Icon,
  Input,
  Markdown,
  Skeleton,
  Textarea,
} from "@/shared/ui";
import { useMilestones } from "../api/sprint-actions";
import { validateMilestone } from "../model/validation";
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

/** 목록 + 위에 뜨는 패널(`?milestone=`). 상세 경로는 만들지 않는다(AGENTS.md). */
function Milestones({ project, manages }: PlanningContext) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const milestones = useQuery(milestoneQueries.list(project.id));
  const actions = useMilestones(project.id);
  const [creating, setCreating] = useState(false);
  const today = seoulToday();
  // 패널은 이 화면(경로)에서만 연다. 떠난 뒤 숨겨진 이 화면이 보드의 `?milestone=` 필터를
  // 패널 열림으로 읽으면 보이지 않는 모달이 남는다(V-route-focus H1).
  const selectedId =
    pathname === routes.projectMilestones(project.id)
      ? search?.get("milestone")
      : null;
  const selected = milestones.data?.find((item) => item.id === selectedId);
  function select(id: string | null) {
    const params = new URLSearchParams(search?.toString());
    if (id) params.set("milestone", id);
    else params.delete("milestone");
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  }
  return (
    <section className="grid gap-5" aria-labelledby="milestones-heading">
      <div className="planning-section-head">
        <h2 id="milestones-heading" className="text-lg font-semibold">
          마일스톤
        </h2>
        {manages && (
          <Button onClick={() => setCreating(true)}>
            <Icon name="plus" className="inline-block" /> 새 마일스톤
          </Button>
        )}
      </div>
      {milestones.isPending ? (
        <div
          role="status"
          aria-label="마일스톤 불러오는 중"
          className="grid gap-2"
        >
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : milestones.isError ? (
        <ErrorState
          title="마일스톤을 불러오지 못했습니다"
          description={milestoneErrorMessage(
            normalizeApiError(milestones.error),
          )}
          onRetry={() => void milestones.refetch()}
        />
      ) : milestones.data.length === 0 ? (
        <EmptyState
          title="아직 마일스톤이 없습니다"
          description={
            manages
              ? "출시나 마감처럼 여러 업무가 함께 닿을 목표를 만들고, 업무 상세에서 지정하세요."
              : "PM 또는 헤드 어드민이 마일스톤을 만들면 여기에 보입니다."
          }
        />
      ) : (
        <ul className="milestone-rows">
          {milestones.data.map((milestone) => (
            <li key={milestone.id}>
              <button
                type="button"
                className="milestone-row"
                aria-haspopup="dialog"
                onClick={() => select(milestone.id)}
              >
                <span className="milestone-row-name">{milestone.name}</span>
                <span
                  className="milestone-row-due"
                  data-overdue={milestoneOverdue(milestone, today) || undefined}
                >
                  {milestone.dueDate
                    ? `${formatDate(milestone.dueDate)} 마감`
                    : "마감 없음"}
                  {milestoneOverdue(milestone, today) && (
                    <span className="sr-only"> (지남)</span>
                  )}
                </span>
                <ProgressBar
                  done={milestone.progress.done}
                  total={milestone.progress.total}
                  label={`${milestone.name} 진행률`}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
      {milestones.data && selectedId && !selected && !milestones.isPending && (
        <p role="status" className="text-sm text-muted">
          찾는 마일스톤이 없습니다. 삭제됐을 수 있습니다.
        </p>
      )}
      {creating && (
        // 닫을 때 내려서 다음에 열면 빈 양식(마감일 포함)으로 시작한다.
        <MilestoneFormDialog
          open
          title="새 마일스톤"
          submitLabel="마일스톤 만들기"
          onClose={() => setCreating(false)}
          onSubmit={(input) => actions.create.mutateAsync(input)}
        />
      )}
      {selected && (
        <MilestonePanel
          projectId={project.id}
          milestone={selected}
          manages={manages}
          actions={actions}
          today={today}
          onClose={() => select(null)}
          onLeave={() => {
            // 다른 화면으로 가기 전에 지금 기록에서 패널을 닫는다: 뒤로가기로 돌아와도 패널이 다시 뜨지 않는다.
            const params = new URLSearchParams(search?.toString());
            params.delete("milestone");
            window.history.replaceState(
              null,
              "",
              `${pathname}${params.size ? `?${params}` : ""}`,
            );
          }}
        />
      )}
    </section>
  );
}

function MilestonePanel({
  projectId,
  milestone,
  manages,
  actions,
  today,
  onClose,
  onLeave,
}: {
  readonly projectId: string;
  readonly milestone: Milestone;
  readonly manages: boolean;
  readonly actions: ReturnType<typeof useMilestones>;
  readonly today: string;
  readonly onClose: () => void;
  readonly onLeave: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (editing)
    return (
      <MilestoneFormDialog
        open
        title="마일스톤 수정"
        submitLabel="변경 저장"
        initial={milestone}
        onClose={() => setEditing(false)}
        onSubmit={(input) =>
          actions.update.mutateAsync({ id: milestone.id, input })
        }
      />
    );
  return (
    <Dialog
      open
      onClose={onClose}
      title={milestone.name}
      className="milestone-panel"
    >
      <div className="grid gap-5">
        <dl className="milestone-facts">
          <div>
            <dt>마감일</dt>
            <dd data-overdue={milestoneOverdue(milestone, today) || undefined}>
              {milestone.dueDate ? formatDate(milestone.dueDate) : "없음"}
              {milestoneOverdue(milestone, today) && " (지남)"}
            </dd>
          </div>
          <div>
            <dt>진행</dt>
            <dd>
              <ProgressBar
                done={milestone.progress.done}
                total={milestone.progress.total}
                label={`${milestone.name} 진행률`}
              />
            </dd>
          </div>
        </dl>
        {milestone.description ? (
          <Markdown>{milestone.description}</Markdown>
        ) : (
          <p className="text-sm text-muted">설명이 없습니다.</p>
        )}
        <p className="text-xs text-muted">
          진행률은 이 마일스톤에 배정된 업무 중 완료된 업무의 비율입니다. 내가
          볼 수 있는 업무만 셉니다.
        </p>
        {milestone.progress.total === 0 && (
          <EmptyState
            title="아직 연결된 업무가 없습니다"
            description="업무 등록이나 상세 화면에서 이 마일스톤을 지정하면 진행률에 반영됩니다."
          />
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {deleting ? (
          <div
            className="milestone-confirm"
            role="group"
            aria-label="삭제 확인"
          >
            <p className="text-sm">
              삭제하면 업무는 그대로 두고 마일스톤 지정만 풉니다.
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
              href={`${routes.project(projectId)}?milestone=${encodeURIComponent(milestone.id)}`}
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
                  onClick={() => setEditing(true)}
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
      </div>
    </Dialog>
  );
}

function MilestoneFormDialog({
  open,
  title,
  submitLabel,
  initial,
  onClose,
  onSubmit,
}: {
  readonly open: boolean;
  readonly title: string;
  readonly submitLabel: string;
  readonly initial?: Milestone;
  readonly onClose: () => void;
  readonly onSubmit: (input: MilestoneInput) => Promise<unknown>;
}) {
  const id = useId();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const input: MilestoneInput = {
      name: String(form.get("name") ?? "").trim(),
      description: String(form.get("description") ?? ""),
      dueDate: String(form.get("dueDate") ?? ""),
    };
    const problems = validateMilestone(input);
    setErrors(problems);
    if (Object.keys(problems).length) return;
    setPending(true);
    try {
      await onSubmit(input);
      onClose();
    } catch (cause) {
      const problem = normalizeApiError(cause);
      setErrors(
        fieldErrors(
          problem,
          ["name", "description", "dueDate"],
          milestoneErrorMessage(problem),
        ),
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!pending) onClose();
      }}
      title={title}
    >
      {open && (
        <form onSubmit={submit} className="grid gap-5" noValidate>
          <Field id={`${id}-name`} label="이름 (필수)" error={errors.name}>
            <Input
              id={`${id}-name`}
              name="name"
              defaultValue={initial?.name}
              placeholder="베타 출시"
              maxLength={100}
              required
              autoFocus
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? `${id}-name-error` : undefined}
            />
          </Field>
          <Field id={`${id}-dueDate`} label="마감일" error={errors.dueDate}>
            <DatePicker
              id={`${id}-dueDate`}
              name="dueDate"
              label="마감일"
              value={dueDate}
              onChange={setDueDate}
              invalid={!!errors.dueDate}
            />
          </Field>
          <Field
            id={`${id}-description`}
            label="설명"
            error={errors.description}
            hint="마크다운을 지원합니다."
          >
            <Textarea
              id={`${id}-description`}
              name="description"
              defaultValue={initial?.description ?? ""}
              maxLength={5000}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={
                errors.description
                  ? `${id}-description-error`
                  : `${id}-description-hint`
              }
            />
          </Field>
          {errors.form && (
            <p role="alert" className="text-sm text-danger">
              {errors.form}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              취소
            </Button>
            <Button type="submit" loading={pending}>
              {submitLabel}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
