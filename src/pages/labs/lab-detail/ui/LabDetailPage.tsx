"use client";

import Link from "next/link";
import { Suspense, useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ExperimentStatusLabel,
  OutcomeBadge,
  experimentApi,
  experimentErrorMessage,
  experimentOutcomes,
  experimentQueries,
  outcomeLabels,
  parseLinkTarget,
  type Experiment,
  type ExperimentOutcome,
  type ExperimentStatus,
} from "@/entities/experiment";
import { projectQueries } from "@/entities/project";
import { isHeadAdmin, type User } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import {
  ExperimentFormDialog,
  useExperimentMutation,
} from "@/features/manage-experiment";
import { routes } from "@/shared/config";
import { formatDate } from "@/shared/lib";
import {
  Button,
  Dialog,
  ErrorState,
  Field,
  Icon,
  Input,
  Markdown,
  Select,
  Skeleton,
  Spinner,
  Textarea,
} from "@/shared/ui";

export function LabDetailPage({
  experimentId,
}: {
  readonly experimentId: string;
}) {
  return (
    <AuthGuard require="work">
      {(user) => (
        <Suspense fallback={<Spinner label="실험 불러오는 중" />}>
          <LabDetailContent experimentId={experimentId} user={user} />
        </Suspense>
      )}
    </AuthGuard>
  );
}

function LabDetailContent({
  experimentId,
  user,
}: {
  readonly experimentId: string;
  readonly user: User;
}) {
  const query = useQuery(experimentQueries.detail(experimentId));
  if (query.isPending)
    return (
      <div role="status" aria-label="실험을 불러오는 중" className="grid gap-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-64" />
      </div>
    );
  if (!query.data)
    return (
      <ErrorState
        description={experimentErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  return <ExperimentView experiment={query.data} user={user} />;
}

function ExperimentView({
  experiment,
  user,
}: {
  readonly experiment: Experiment;
  readonly user: User;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const status = useExperimentMutation((next: ExperimentStatus) =>
    experimentApi.changeStatus(experiment.id, { status: next }),
  );
  const remove = useExperimentMutation(() =>
    experimentApi.remove(experiment.id),
  );
  const finished =
    experiment.status === "DONE" || experiment.status === "STOPPED";
  return (
    <div className="task-detail">
      <header className="page-header mb-6">
        <div className="min-w-0">
          <p className="board-breadcrumb">
            <Link href={routes.labs}>실험실</Link>
          </p>
          <h1 className="break-words">{experiment.title}</h1>
          <p className="page-subtitle flex flex-wrap items-center gap-2">
            <ExperimentStatusLabel status={experiment.status} />
            {experiment.outcome && (
              <OutcomeBadge outcome={experiment.outcome} />
            )}
          </p>
        </div>
        {experiment.canEdit && (
          <div className="page-actions">
            {experiment.status === "PLANNED" && (
              <Button
                loading={status.isPending}
                onClick={() => status.mutate("RUNNING")}
              >
                시작하기
              </Button>
            )}
            {experiment.status === "RUNNING" && (
              <Button onClick={() => setFinishing(true)}>결과 정리하기</Button>
            )}
            {!finished && (
              <Button
                variant="ghost"
                disabled={status.isPending}
                onClick={() => status.mutate("STOPPED")}
              >
                중단
              </Button>
            )}
            {finished && (
              <Button
                variant="secondary"
                loading={status.isPending}
                onClick={() => status.mutate("RUNNING")}
              >
                다시 열기
              </Button>
            )}
            <Button variant="secondary" onClick={() => setEditing(true)}>
              고치기
            </Button>
            {experiment.canDelete && (
              <Button variant="ghost" onClick={() => setDeleting(true)}>
                삭제
              </Button>
            )}
          </div>
        )}
      </header>
      {status.isError && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {experimentErrorMessage(status.error)}
        </p>
      )}
      <div className="task-detail-grid">
        <div className="task-main">
          <Section title="가설" body={experiment.hypothesis} />
          <Section
            title="측정 기준"
            body={experiment.metric}
            empty="무엇을 보면 성공인지 아직 정하지 않았습니다."
          />
          <Section
            title="해볼 것"
            body={experiment.method}
            empty="아직 적지 않았습니다."
          />
          <EditableSection
            experiment={experiment}
            field="result"
            title="결과"
            empty={
              finished
                ? "결과가 적혀 있지 않습니다."
                : "끝나면 측정한 값과 결과를 적습니다."
            }
          />
          <EditableSection
            experiment={experiment}
            field="learnings"
            title="배운 점"
            empty="성공이든 실패든 다음에 참고할 점을 남깁니다."
          />
          {experiment.outcome === "SUCCESS" &&
            !experiment.promotedProjectId && (
              <div className="lab-promote">
                <p>
                  효과가 확인된 실험입니다. 제대로 만들 거라면 프로젝트로 옮겨
                  보세요.
                </p>
                {isHeadAdmin(user) && (
                  <Link
                    href="/admin?create=project"
                    className="ui-button ui-button-secondary ui-button-sm"
                  >
                    프로젝트 만들기
                  </Link>
                )}
              </div>
            )}
        </div>
        <Properties experiment={experiment} />
      </div>
      <ExperimentFormDialog
        open={editing}
        experiment={experiment}
        currentUserId={user.id}
        onClose={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
      <FinishDialog
        open={finishing}
        experiment={experiment}
        onClose={() => setFinishing(false)}
      />
      <Dialog
        open={deleting}
        onClose={() => {
          if (!remove.isPending) setDeleting(false);
        }}
        title="실험을 삭제할까요?"
      >
        <p className="mb-6 text-sm text-muted">
          가설과 결과 기록이 모두 사라집니다. 연결된 업무, 문서는 그대로
          남습니다.
        </p>
        {remove.isError && (
          <p role="alert" className="mb-4 text-sm text-danger">
            {experimentErrorMessage(remove.error)}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            disabled={remove.isPending}
            onClick={() => setDeleting(false)}
          >
            취소
          </Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            onClick={() =>
              remove.mutate(undefined, {
                onSuccess: () => router.replace(routes.labs),
              })
            }
          >
            삭제
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function Section({
  title,
  body,
  empty,
}: {
  readonly title: string;
  readonly body: string;
  readonly empty?: string;
}) {
  return (
    <section>
      <h2 className="task-section-title">{title}</h2>
      {body.trim() ? (
        <Markdown>{body}</Markdown>
      ) : (
        <p className="text-sm text-muted">{empty}</p>
      )}
    </section>
  );
}

function EditableSection({
  experiment,
  field,
  title,
  empty,
}: {
  readonly experiment: Experiment;
  readonly field: "result" | "learnings";
  readonly title: string;
  readonly empty: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const save = useExperimentMutation((value: string) =>
    experimentApi.update(experiment.id, { [field]: value }),
  );
  const value = experiment[field];
  if (draft === null)
    return (
      <section>
        <div className="flex items-center justify-between gap-2">
          <h2 className="task-section-title">{title}</h2>
          {experiment.canEdit && (
            <button
              type="button"
              className="ui-link-button"
              onClick={() => setDraft(value)}
            >
              {value.trim() ? "고치기" : "쓰기"}
            </button>
          )}
        </div>
        {value.trim() ? (
          <Markdown>{value}</Markdown>
        ) : (
          <p className="text-sm text-muted">{empty}</p>
        )}
      </section>
    );
  return (
    <section className="grid gap-2">
      <label htmlFor={`${id}-text`} className="task-section-title">
        {title}
      </label>
      <Textarea
        id={`${id}-text`}
        value={draft}
        autoFocus
        onChange={(event) => setDraft(event.target.value)}
      />
      <p className="text-xs text-muted">마크다운을 쓸 수 있습니다.</p>
      {save.isError && (
        <p role="alert" className="text-sm text-danger">
          {experimentErrorMessage(save.error)}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          className="ui-button-sm"
          loading={save.isPending}
          onClick={() =>
            save.mutate(draft, { onSuccess: () => setDraft(null) })
          }
        >
          저장
        </Button>
        <Button
          variant="ghost"
          className="ui-button-sm"
          disabled={save.isPending}
          onClick={() => setDraft(null)}
        >
          취소
        </Button>
      </div>
    </section>
  );
}

/** 진행 중인 실험을 끝낸다: 결과(성공·실패·판단 보류)는 필수, 결과·배운 점은 같이 적을 수 있다. */
function FinishDialog({
  open,
  experiment,
  onClose,
}: {
  readonly open: boolean;
  readonly experiment: Experiment;
  readonly onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="결과 정리하기"
      className="incident-dialog"
    >
      {open && <FinishForm experiment={experiment} onClose={onClose} />}
    </Dialog>
  );
}

function FinishForm({
  experiment,
  onClose,
}: {
  readonly experiment: Experiment;
  readonly onClose: () => void;
}) {
  const id = useId();
  const [outcome, setOutcome] = useState<ExperimentOutcome | "">("");
  const [result, setResult] = useState(experiment.result);
  const [learnings, setLearnings] = useState(experiment.learnings);
  const [error, setError] = useState("");
  const finish = useExperimentMutation(async (chosen: ExperimentOutcome) => {
    await experimentApi.update(experiment.id, { result, learnings });
    return experimentApi.changeStatus(experiment.id, {
      status: "DONE",
      outcome: chosen,
    });
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (finish.isPending) return;
    if (!outcome) {
      setError("결과를 골라 주세요.");
      return;
    }
    setError("");
    finish.mutate(outcome, { onSuccess: onClose });
  };
  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      {experiment.metric.trim() && (
        <div className="lab-metric">
          <p className="task-section-title">측정 기준</p>
          <Markdown>{experiment.metric}</Markdown>
        </div>
      )}
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-semibold">결과</legend>
        <div className="flex flex-wrap gap-2">
          {experimentOutcomes.map((value) => (
            <label
              key={value}
              className="ui-priority-option"
              data-outcome={value}
            >
              <input
                type="radio"
                name={`${id}-outcome`}
                value={value}
                checked={outcome === value}
                onChange={() => setOutcome(value)}
              />
              {outcomeLabels[value]}
            </label>
          ))}
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </fieldset>
      <Field
        id={`${id}-result`}
        label="결과"
        hint="측정한 값과 무슨 일이 있었는지 적습니다."
      >
        <Textarea
          id={`${id}-result`}
          value={result}
          onChange={(event) => setResult(event.target.value)}
        />
      </Field>
      <Field id={`${id}-learnings`} label="배운 점">
        <Textarea
          id={`${id}-learnings`}
          value={learnings}
          className="min-h-20"
          onChange={(event) => setLearnings(event.target.value)}
        />
      </Field>
      {finish.isError && (
        <p role="alert" className="text-sm text-danger">
          {experimentErrorMessage(finish.error)}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          disabled={finish.isPending}
          onClick={onClose}
        >
          취소
        </Button>
        <Button type="submit" loading={finish.isPending}>
          실험 끝내기
        </Button>
      </div>
    </form>
  );
}

function Properties({ experiment }: { readonly experiment: Experiment }) {
  const projects = useQuery(projectQueries.list());
  const promote = useExperimentMutation((projectId: string | null) =>
    experimentApi.update(experiment.id, { promotedProjectId: projectId }),
  );
  const promoted = projects.data?.find(
    (project) => project.id === experiment.promotedProjectId,
  );
  return (
    <aside className="task-props" aria-label="실험 속성">
      <dl>
        <div>
          <dt>상태</dt>
          <dd>
            <ExperimentStatusLabel status={experiment.status} />
          </dd>
        </div>
        <div>
          <dt>결과</dt>
          <dd>
            {experiment.outcome ? (
              <OutcomeBadge outcome={experiment.outcome} />
            ) : (
              <span className="text-faint">—</span>
            )}
          </dd>
        </div>
        <div>
          <dt>담당자</dt>
          <dd>
            {experiment.owner?.name ?? (
              <span className="text-faint">미지정</span>
            )}
          </dd>
        </div>
        <div>
          <dt>기간</dt>
          <dd className="tabular-nums">
            {experiment.startDate || experiment.endDate
              ? `${formatDate(experiment.startDate, { year: undefined })} ~ ${formatDate(experiment.endDate, { year: undefined })}`
              : "미정"}
          </dd>
        </div>
        {experiment.finishedAt && (
          <div>
            <dt>끝난 날</dt>
            <dd>{formatDate(experiment.finishedAt)}</dd>
          </div>
        )}
        <div>
          <dt>프로젝트</dt>
          <dd>
            {experiment.canEdit ? (
              <Select
                aria-label="옮긴 프로젝트"
                value={experiment.promotedProjectId ?? ""}
                disabled={promote.isPending}
                onChange={(event) => promote.mutate(event.target.value || null)}
              >
                <option value="">없음</option>
                {projects.data?.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            ) : promoted ? (
              <Link href={routes.project(promoted.id)} className="underline">
                {promoted.name}
              </Link>
            ) : (
              <span className="text-faint">없음</span>
            )}
          </dd>
        </div>
      </dl>
      {promote.isError && (
        <p role="alert" className="text-sm text-danger">
          {experimentErrorMessage(promote.error)}
        </p>
      )}
      <Links experiment={experiment} />
    </aside>
  );
}

function Links({ experiment }: { readonly experiment: Experiment }) {
  const id = useId();
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);
  const add = useExperimentMutation(
    (target: { kind: "TASK" | "DOCUMENT"; targetId: string }) =>
      experimentApi.addLink(experiment.id, target),
  );
  const remove = useExperimentMutation(
    (target: { kind: "TASK" | "DOCUMENT"; id: string }) =>
      experimentApi.removeLink(experiment.id, target.kind, target.id),
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const target = parseLinkTarget(value);
    setInvalid(!target);
    if (target) add.mutate(target, { onSuccess: () => setValue("") });
  };
  return (
    <section className="grid gap-2">
      <h2 className="task-section-title">관련 업무, 문서</h2>
      {experiment.links.length === 0 ? (
        <p className="text-sm text-muted">없음</p>
      ) : (
        <ul className="grid gap-1">
          {experiment.links.map((link) => (
            <li key={`${link.kind}-${link.id}`} className="lab-link">
              <Icon name={link.kind === "TASK" ? "board" : "doc"} />
              <Link
                href={
                  link.kind === "TASK"
                    ? routes.task(link.id)
                    : routes.doc(link.id)
                }
                className="min-w-0 truncate hover:underline"
                title={link.title}
              >
                {link.key && (
                  <span className="font-mono text-xs text-muted">
                    {link.key}{" "}
                  </span>
                )}
                {link.title}
              </Link>
              {experiment.canEdit && (
                <button
                  type="button"
                  className="ui-link-button ml-auto"
                  aria-label={`${link.title} 연결 해제`}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(link)}
                >
                  해제
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {experiment.canEdit && (
        <form onSubmit={submit} className="grid gap-1">
          <div className="flex gap-2">
            <Input
              id={`${id}-link`}
              aria-label="업무, 문서 주소"
              placeholder="업무, 문서 주소 붙여넣기"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <Button type="submit" variant="secondary" loading={add.isPending}>
              연결
            </Button>
          </div>
          {(invalid || add.isError) && (
            <p role="alert" className="text-xs text-danger">
              {invalid
                ? "이 앱의 업무(/tasks/…)나 문서(/docs/…) 주소를 붙여넣으세요."
                : experimentErrorMessage(add.error)}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
