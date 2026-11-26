"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  incidentApi,
  incidentErrorMessage,
  type ActionItem,
  type IncidentDetail,
  type Postmortem,
} from "@/entities/incident";
import { projectQueries } from "@/entities/project";
import { statusLabels } from "@/entities/task";
import { activeUsersQueryOptions } from "@/entities/user";
import { routes } from "@/shared/config";
import {
  Button,
  Checkbox,
  Dialog,
  Field,
  IconButton,
  Icon,
  Input,
  Select,
  Spinner,
} from "@/shared/ui";
import { usePostmortemMutation } from "../api/mutations";

/** 조치 항목 → 업무 만들기는 기존 업무 생성 규칙 그대로(D7-7). 항목당 업무 하나, 개인 업무는 만들 수 없다. */
export function ActionItems({
  incident,
  postmortem,
}: {
  readonly incident: IncidentDetail;
  readonly postmortem: Postmortem;
}) {
  const id = useId();
  const [title, setTitle] = useState("");
  const [creatingFor, setCreatingFor] = useState<ActionItem | null>(null);
  const add = usePostmortemMutation(incident.id, (value: string) =>
    incidentApi.addActionItem(incident.id, value),
  );
  const remove = usePostmortemMutation(incident.id, (itemId: string) =>
    incidentApi.removeActionItem(incident.id, itemId),
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (add.isPending || !title.trim()) return;
    add.mutate(title.trim(), { onSuccess: () => setTitle("") });
  };
  const items = postmortem.actionItems;
  return (
    <section aria-labelledby={`${id}-heading`} className="grid gap-3">
      <h3 id={`${id}-heading`} className="text-md font-semibold">
        조치 항목{" "}
        <span className="text-sm font-normal text-muted tabular-nums">
          {items.length}
        </span>
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted">
          재발을 막을 일을 적고 업무로 만들어 추적하세요.
        </p>
      ) : (
        <ul className="action-items">
          {items.map((item) => (
            <li key={item.id}>
              <span className="min-w-0 wrap-anywhere">{item.title}</span>
              <span className="flex flex-wrap items-center gap-2">
                <ActionItemTask item={item} />
                {postmortem.canEdit && !item.task && (
                  <Button
                    variant="secondary"
                    className="ui-button-sm"
                    onClick={() => setCreatingFor(item)}
                  >
                    업무 만들기
                  </Button>
                )}
                {postmortem.canEdit && (
                  <IconButton
                    aria-label={`조치 항목 "${item.title}" 삭제`}
                    variant="ghost"
                    className="ui-button-sm"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (!remove.isPending) remove.mutate(item.id);
                    }}
                  >
                    <Icon name="close" width={16} height={16} />
                  </IconButton>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {remove.error ? (
        <p role="alert" className="text-sm text-danger">
          {incidentErrorMessage(remove.error)}
        </p>
      ) : null}
      {postmortem.canEdit && (
        <form className="flex flex-wrap gap-2" onSubmit={submit}>
          <label htmlFor={`${id}-title`} className="sr-only">
            새 조치 항목
          </label>
          <Input
            id={`${id}-title`}
            value={title}
            maxLength={200}
            className="min-w-0 flex-1"
            placeholder="예: OAuth 비밀값 만료 알림 추가"
            onChange={(event) => setTitle(event.target.value)}
          />
          <Button
            type="submit"
            variant="secondary"
            loading={add.isPending}
            disabled={!title.trim()}
          >
            추가
          </Button>
          {add.error ? (
            <p role="alert" className="w-full text-sm text-danger">
              {incidentErrorMessage(add.error)}
            </p>
          ) : null}
        </form>
      )}
      <Dialog
        open={!!creatingFor}
        onClose={() => setCreatingFor(null)}
        title="조치 항목으로 업무 만들기"
        className="incident-dialog"
      >
        {creatingFor && (
          <CreateTaskForm
            incidentId={incident.id}
            item={creatingFor}
            onClose={() => setCreatingFor(null)}
          />
        )}
      </Dialog>
    </section>
  );
}

function ActionItemTask({ item }: { readonly item: ActionItem }) {
  if (!item.task) return null;
  if (!item.task.accessible || !item.task.id)
    return <span className="text-sm text-muted">볼 수 없는 업무</span>;
  return (
    <Link href={routes.task(item.task.id)} className="action-item-task">
      {item.task.status && (
        <span
          className="status-icon"
          data-status={item.task.status}
          aria-hidden="true"
        />
      )}
      <span className="font-mono text-xs text-muted">
        {item.task.key ?? "팀 공용"}
      </span>
      <span className="sr-only">
        {item.task.status ? statusLabels[item.task.status] : ""}
      </span>
    </Link>
  );
}

function CreateTaskForm({
  incidentId,
  item,
  onClose,
}: {
  readonly incidentId: string;
  readonly item: ActionItem;
  readonly onClose: () => void;
}) {
  const id = useId();
  const [scope, setScope] = useState<"PROJECT" | "TEAM">("PROJECT");
  const [projectId, setProjectId] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<readonly string[]>([]);
  const [error, setError] = useState("");
  const projects = useQuery(projectQueries.list());
  const project = useQuery({
    ...projectQueries.detail(projectId),
    enabled: scope === "PROJECT" && !!projectId,
  });
  const users = useQuery({
    ...activeUsersQueryOptions(),
    enabled: scope === "TEAM",
  });
  const create = usePostmortemMutation(incidentId, () =>
    incidentApi.createActionItemTask(incidentId, item.id, {
      scope,
      projectId: scope === "PROJECT" ? projectId : undefined,
      assigneeIds,
    }),
  );
  const openProjects =
    projects.data?.filter((candidate) => !candidate.archived) ?? [];
  const people =
    scope === "PROJECT"
      ? (project.data?.members.map((member) => ({
          id: member.userId,
          name: member.name,
        })) ?? [])
      : (users.data ?? []);
  const peoplePending =
    scope === "PROJECT" ? !!projectId && project.isPending : users.isPending;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (create.isPending) return;
    if (scope === "PROJECT" && !projectId) {
      setError("프로젝트를 고르세요.");
      return;
    }
    setError("");
    create.mutate(undefined, { onSuccess: onClose });
  };
  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <div className="grid gap-1">
        <p className="text-sm text-muted">업무 제목</p>
        <p className="wrap-anywhere">{item.title}</p>
        <p className="text-xs text-muted">
          종류 TASK, 상태 백로그로 만듭니다. 설명은 비워 사후 검토 글이 업무로
          퍼지지 않게 합니다.
        </p>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">범위</legend>
        <div className="ui-segmented justify-self-start">
          {(
            [
              ["PROJECT", "프로젝트"],
              ["TEAM", "팀 공용"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="ui-segmented-option">
              <input
                type="radio"
                name={`${id}-scope`}
                value={value}
                checked={scope === value}
                onChange={() => {
                  setScope(value);
                  setAssigneeIds([]);
                }}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {scope === "PROJECT" && (
        <Field id={`${id}-project`} label="프로젝트" error={error}>
          {projects.isPending ? (
            <Spinner label="프로젝트 불러오는 중" />
          ) : (
            <Select
              id={`${id}-project`}
              value={projectId}
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-project-error` : undefined}
              onChange={(event) => {
                setProjectId(event.target.value);
                setAssigneeIds([]);
                setError("");
              }}
            >
              <option value="" disabled>
                프로젝트 선택
              </option>
              {openProjects.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} ({candidate.key})
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">담당자(선택)</legend>
        {peoplePending ? (
          <Spinner label="담당자 후보 불러오는 중" />
        ) : people.length === 0 ? (
          <p className="text-sm text-muted">
            {scope === "PROJECT" && !projectId
              ? "프로젝트를 고르면 참여자가 나옵니다."
              : "고를 수 있는 담당자가 없습니다."}
          </p>
        ) : (
          <div className="incident-checklist">
            {people.map((person) => (
              <label
                key={person.id}
                className="flex items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={assigneeIds.includes(person.id)}
                  onChange={(event) =>
                    setAssigneeIds((current) =>
                      event.target.checked
                        ? [...current, person.id]
                        : current.filter((userId) => userId !== person.id),
                    )
                  }
                />
                {person.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      {create.error ? (
        <p role="alert" className="text-sm text-danger">
          {incidentErrorMessage(create.error)}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          disabled={create.isPending}
          onClick={onClose}
        >
          취소
        </Button>
        <Button type="submit" loading={create.isPending}>
          업무 만들기
        </Button>
      </div>
    </form>
  );
}
