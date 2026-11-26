"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import {
  canCreateTasksIn,
  MAX_TASKS_PER_REQUEST,
  requirementApi,
  requirementErrorMessage,
  sectionItems,
  type RequirementDetail,
  type RequirementTaskItem,
} from "@/entities/requirement";
import {
  priorityLabels,
  statusLabels,
  type TaskPriority,
  type TaskType,
} from "@/entities/task";
import { useProjectRepositories } from "@/features/project-integrations";
import { routes } from "@/shared/config";
import { repositoryName } from "@/shared/lib";
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  Field,
  Input,
  Select,
  useToast,
} from "@/shared/ui";
import { useRequirementChange } from "../api/change";
import { taskIdFromInput } from "../model/task-input";

/** 연결 업무(18·19). 업무 설명에는 요구사항 링크·기능 항목·수용 기준만 들어간다(서버 D12-6). */
export function RequirementTasks({
  requirement,
}: {
  readonly requirement: RequirementDetail;
}) {
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [linking, setLinking] = useState(false);
  const unlink = useRequirementChange(
    requirement.id,
    (taskId: string) => requirementApi.unlinkTask(requirement.id, taskId),
    { tasksChanged: true },
  );
  const features = sectionItems(
    requirement.sections.find((section) => section.key === "features")?.body,
  );
  const creatable =
    requirement.canManage &&
    !!requirement.projectId &&
    canCreateTasksIn(requirement.status);
  const hidden = requirement.progress.total - requirement.tasks.length;
  return (
    <section className="grid gap-3" aria-labelledby="req-tasks">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="req-tasks">업무</h2>
        {requirement.canManage && (
          <span className="flex flex-wrap gap-2">
            {creatable && (
              <Button
                variant="secondary"
                className="ui-button-sm"
                onClick={() => setCreating(true)}
              >
                업무 만들기
              </Button>
            )}
            <Button
              variant="ghost"
              className="ui-button-sm"
              onClick={() => setLinking(true)}
            >
              기존 업무 연결
            </Button>
          </span>
        )}
      </div>
      {requirement.canManage && !requirement.projectId && (
        <p className="text-sm text-muted">
          조직 단위 요구사항은 프로젝트를 지정한 뒤 업무를 만들 수 있습니다. 팀
          공용 업무는 연결할 수 있습니다.
        </p>
      )}
      {requirement.canManage &&
        requirement.projectId &&
        !canCreateTasksIn(requirement.status) && (
          <p className="text-sm text-muted">
            수락하거나 진행 중일 때 업무를 만들 수 있습니다.
          </p>
        )}
      {requirement.tasks.length === 0 && hidden <= 0 ? (
        <p className="text-sm text-muted">연결된 업무가 없습니다.</p>
      ) : (
        <ul className="list" aria-label="연결 업무">
          {requirement.tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-2">
              <Link
                href={routes.task(task.id)}
                className="list-row min-w-0 flex-1"
              >
                {task.key && (
                  <span className="shrink-0 text-xs text-muted">
                    {task.key}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{task.title}</span>
                <Badge>{statusLabels[task.status]}</Badge>
              </Link>
              {requirement.canManage && (
                <Button
                  variant="ghost"
                  className="ui-button-sm"
                  aria-label={`${task.title} 연결 끊기`}
                  disabled={unlink.isPending}
                  onClick={() =>
                    unlink.mutate(task.id, {
                      onError: (error) =>
                        toast(requirementErrorMessage(error), "error"),
                    })
                  }
                >
                  연결 끊기
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {hidden > 0 && (
        <p className="text-sm text-muted">
          볼 수 없는 업무 {hidden}개가 더 연결되어 있습니다.
        </p>
      )}
      {creating && requirement.projectId && (
        <CreateTasksDialog
          requirement={requirement}
          projectId={requirement.projectId}
          features={features}
          onClose={() => setCreating(false)}
        />
      )}
      <LinkTaskDialog
        open={linking}
        requirement={requirement}
        onClose={() => setLinking(false)}
      />
    </section>
  );
}

type Row = {
  readonly key: number;
  readonly featureIndex?: number;
  readonly feature?: string;
  readonly selected: boolean;
  readonly title: string;
  readonly type: TaskType;
  readonly priority: TaskPriority;
};

function CreateTasksDialog({
  requirement,
  projectId,
  features,
  onClose,
}: {
  readonly requirement: RequirementDetail;
  readonly projectId: string;
  readonly features: readonly string[];
  readonly onClose: () => void;
}) {
  const id = useId();
  const toast = useToast();
  const [rows, setRows] = useState<readonly Row[]>(() =>
    features.slice(0, MAX_TASKS_PER_REQUEST).map((feature, index) => ({
      key: index,
      featureIndex: index,
      feature,
      selected: true,
      title: "",
      type: "TASK",
      priority: "P2",
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const repositories = useProjectRepositories(projectId, true);
  // 기본 발행 저장소가 공개면 진행 예정 이상에서 업무 설명이 공개 Issue 로 나간다(계획 위험표). 확인만 받고 막지는 않는다.
  const publicDefault = repositories.data?.find(
    (repository) => repository.isDefault && !repository.private,
  );
  const create = useRequirementChange(
    requirement.id,
    (tasks: readonly RequirementTaskItem[]) =>
      requirementApi.createTasks(requirement.id, tasks),
    { tasksChanged: true },
  );
  const update = (key: number, change: Partial<Row>) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...change } : row)),
    );
  const selected = rows.filter((row) => row.selected);
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (create.isPending) return;
    if (selected.length === 0)
      return setError("만들 업무를 하나 이상 고르세요.");
    if (selected.length > MAX_TASKS_PER_REQUEST)
      return setError(
        `한 번에 ${MAX_TASKS_PER_REQUEST}개까지 만들 수 있습니다.`,
      );
    if (
      selected.some(
        (row) => row.featureIndex === undefined && !row.title.trim(),
      )
    )
      return setError("직접 추가한 업무에는 제목이 필요합니다.");
    if (selected.some((row) => row.title.trim().length > 200))
      return setError("제목은 200자 이하입니다.");
    create.mutate(
      selected.map((row) => ({
        ...(row.title.trim() ? { title: row.title.trim() } : {}),
        ...(row.featureIndex !== undefined
          ? { featureIndex: row.featureIndex }
          : {}),
        type: row.type,
        priority: row.priority,
      })),
      {
        onSuccess: () => {
          toast(`업무 ${selected.length}개를 만들었습니다.`, "success");
          onClose();
        },
        onError: (problem) => setError(requirementErrorMessage(problem)),
      },
    );
  };
  return (
    <Dialog
      open
      onClose={() => {
        if (!create.isPending) onClose();
      }}
      title="요구사항에서 업무 만들기"
      className="max-w-3xl"
    >
      <form noValidate onSubmit={onSubmit} className="grid gap-4">
        <p className="text-sm text-muted">
          업무는 검토 필요 상태로 만들어집니다. 설명에는 요구사항 링크와 기능
          항목, 수용 기준만 들어가고 요청자 정보는 들어가지 않습니다. 하나라도
          실패하면 아무것도 만들지 않습니다.
        </p>
        {publicDefault && (
          <p role="alert" className="rounded-xl bg-surface-box p-4 text-sm">
            <span className="font-semibold">공개 저장소 주의. </span>
            기본 발행 저장소 {repositoryName(publicDefault)}는 공개
            저장소입니다. 업무가 진행 예정 이상이 되면 제목과 설명(기능 항목,
            수용 기준)이 누구나 볼 수 있는 Issue로 발행됩니다. 고객 정보가
            제목에 들어가지 않았는지 확인하세요.
          </p>
        )}
        <ul className="grid gap-3" aria-label="만들 업무">
          {rows.map((row, index) => (
            <li
              key={row.key}
              className="grid gap-2 rounded-xl bg-surface-box p-3"
            >
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={row.selected}
                  onChange={(event) =>
                    update(row.key, { selected: event.target.checked })
                  }
                />
                <span className="min-w-0 wrap-anywhere">
                  {row.feature ?? `직접 추가 ${index + 1 - features.length}`}
                </span>
              </label>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <Input
                  aria-label={`${index + 1}번 업무 제목`}
                  placeholder={
                    row.feature ? "비우면 기능 항목 문장이 제목" : "업무 제목"
                  }
                  maxLength={200}
                  value={row.title}
                  disabled={!row.selected}
                  onChange={(event) =>
                    update(row.key, { title: event.target.value })
                  }
                />
                <Select
                  aria-label={`${index + 1}번 업무 종류`}
                  value={row.type}
                  disabled={!row.selected}
                  onChange={(event) =>
                    update(row.key, { type: event.target.value as TaskType })
                  }
                >
                  <option value="TASK">일반</option>
                  <option value="DEV">개발</option>
                </Select>
                <Select
                  aria-label={`${index + 1}번 업무 우선순위`}
                  value={row.priority}
                  disabled={!row.selected}
                  onChange={(event) =>
                    update(row.key, {
                      priority: event.target.value as TaskPriority,
                    })
                  }
                >
                  {(Object.keys(priorityLabels) as TaskPriority[]).map(
                    (priority) => (
                      <option key={priority} value={priority}>
                        {priority} {priorityLabels[priority]}
                      </option>
                    ),
                  )}
                </Select>
              </div>
            </li>
          ))}
        </ul>
        {rows.length < MAX_TASKS_PER_REQUEST && (
          <div>
            <Button
              variant="secondary"
              className="ui-button-sm"
              onClick={() =>
                setRows((current) => [
                  ...current,
                  {
                    key: Math.max(-1, ...current.map((row) => row.key)) + 1,
                    selected: true,
                    title: "",
                    type: "TASK",
                    priority: "P2",
                  },
                ])
              }
            >
              업무 직접 추가
            </Button>
          </div>
        )}
        {error && (
          <p id={`${id}-error`} role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-sm text-muted tabular-nums">
            {selected.length}/{MAX_TASKS_PER_REQUEST}개
          </span>
          <Button
            variant="secondary"
            disabled={create.isPending}
            onClick={onClose}
          >
            취소
          </Button>
          <Button type="submit" loading={create.isPending}>
            만들기
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function LinkTaskDialog({
  open,
  requirement,
  onClose,
}: {
  readonly open: boolean;
  readonly requirement: RequirementDetail;
  readonly onClose: () => void;
}) {
  const id = useId();
  const toast = useToast();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const link = useRequirementChange(
    requirement.id,
    (taskId: string) => requirementApi.linkTask(requirement.id, taskId),
    { tasksChanged: true },
  );
  const close = () => {
    if (link.isPending) return;
    setValue("");
    setError(null);
    onClose();
  };
  return (
    <Dialog open={open} onClose={close} title="기존 업무 연결">
      <form
        noValidate
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const taskId = taskIdFromInput(value);
          if (!taskId) {
            setError("업무 주소(…/tasks/…)나 업무 ID를 붙여 넣으세요.");
            return;
          }
          if (link.isPending) return;
          link.mutate(taskId, {
            onSuccess: () => {
              toast("업무를 연결했습니다.", "success");
              close();
            },
            onError: (problem) => setError(requirementErrorMessage(problem)),
          });
        }}
      >
        <Field
          id={`${id}-task`}
          label="업무 주소"
          hint={
            requirement.projectId
              ? "같은 프로젝트의 업무만 연결합니다. 업무 상세 주소를 붙여 넣으세요."
              : "팀 공용 업무만 연결합니다. 업무 상세 주소를 붙여 넣으세요."
          }
          error={error ?? undefined}
        >
          <Input
            id={`${id}-task`}
            autoComplete="off"
            value={value}
            aria-invalid={!!error || undefined}
            onChange={(event) => setValue(event.target.value)}
          />
        </Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" disabled={link.isPending} onClick={close}>
            취소
          </Button>
          <Button type="submit" loading={link.isPending}>
            연결
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
