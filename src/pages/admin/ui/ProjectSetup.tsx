"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  projectQueries,
  type Project,
  type ProjectDetail,
} from "@/entities/project";
import { activeUsersQueryOptions, type UserSummary } from "@/entities/user";
import { RepositorySettings } from "@/features/project-integrations";
import { settingsErrorMessage } from "@/features/project-settings";
import { api, normalizeApiError } from "@/shared/api";
import { routes } from "@/shared/config";
import {
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  Field,
  ListSkeleton,
  Select,
} from "@/shared/ui";

export function ProjectSetup({
  project,
  onSaved,
}: {
  readonly project: Project;
  readonly onSaved: () => Promise<unknown>;
}) {
  const [step, setStep] = useState<"team" | "repository">("team");
  const detail = useQuery(projectQueries.detail(project.id));
  const users = useQuery(activeUsersQueryOptions());
  return (
    <div className="grid gap-6">
      <p role="status" className="text-sm">
        {project.name} 프로젝트를 생성했습니다.
      </p>
      <ol className="ui-steps" aria-label="프로젝트 생성 단계">
        <li>기본 정보</li>
        <li aria-current={step === "team" ? "step" : undefined}>팀원, PM</li>
        <li aria-current={step === "team" ? undefined : "step"}>저장소 연결</li>
      </ol>
      {step === "team" ? (
        <>
          {detail.isPending || users.isPending ? (
            <ListSkeleton label="팀원 설정 불러오는 중" rowClassName="h-11" />
          ) : detail.isError || users.isError ? (
            <ErrorState
              description="팀원 설정을 불러오지 못했습니다. 프로젝트는 생성되어 있습니다."
              onRetry={() => {
                void detail.refetch();
                void users.refetch();
              }}
            />
          ) : (
            <ProjectTeamStep
              project={detail.data}
              users={users.data}
              onNext={async () => {
                await onSaved();
                setStep("repository");
              }}
            />
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-muted">
            건너뛰고 나중에 프로젝트 설정에서 연결해도 돼요.
          </p>
          <RepositorySettings
            projectId={project.id}
            projectKey={project.key}
            disabled={false}
          />
          <Link
            className="ui-button ui-button-primary justify-self-start"
            href={routes.project(project.id)}
          >
            프로젝트 보드로 이동
          </Link>
        </>
      )}
      <Link
        href={`${routes.projectSettings(project.id)}?tab=${step === "team" ? "members" : "integrations"}`}
        className="ui-link-button justify-self-start"
      >
        프로젝트 설정에서 이어하기
      </Link>
    </div>
  );
}

function ProjectTeamStep({
  project,
  users,
  onNext,
}: {
  readonly project: ProjectDetail;
  readonly users: readonly UserSummary[];
  readonly onNext: () => Promise<void>;
}) {
  const [selected, setSelected] = useState(
    project.members.map((member) => member.userId),
  );
  const [pm, setPm] = useState(project.pmUserId ?? "");
  const saved = useRef(new Set(selected));
  const [phase, setPhase] = useState("팀원");
  const save = useMutation({
    mutationFn: async () => {
      const desired = new Set(pm ? [...selected, pm] : selected);
      setPhase("팀원");
      for (const userId of desired) {
        if (saved.current.has(userId)) continue;
        await api.post(`/api/v1/projects/${project.id}/members`, { userId });
        saved.current.add(userId);
      }
      for (const userId of saved.current) {
        if (desired.has(userId)) continue;
        await api.delete(`/api/v1/projects/${project.id}/members/${userId}`);
        saved.current.delete(userId);
      }
      setPhase("PM");
      await api.put(`/api/v1/projects/${project.id}/pm`, {
        userId: pm || null,
      });
    },
    onSuccess: onNext,
  });
  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!save.isPending) save.mutate();
      }}
    >
      <fieldset className="grid min-w-0 gap-2" disabled={save.isPending}>
        <legend className="mb-2 text-sm font-medium">참여할 활성 팀원</legend>
        {users.length === 0 && (
          <EmptyState
            title="추가할 활성 팀원이 없습니다"
            description="프로젝트 설정에서 나중에 추가할 수 있습니다."
          />
        )}
        {users.map((user) => (
          <label
            key={user.id}
            className="flex min-h-11 items-center gap-2 border-b border-border text-sm"
          >
            <Checkbox
              checked={selected.includes(user.id)}
              onChange={(event) =>
                setSelected(
                  event.target.checked
                    ? [...selected, user.id]
                    : selected.filter((id) => id !== user.id),
                )
              }
            />
            <span className="min-w-0 break-words">
              {user.name} <span className="text-muted">({user.username})</span>
            </span>
          </label>
        ))}
        <Field id="create-project-pm" label="PM" hint="나중에 정해도 돼요.">
          <Select
            id="create-project-pm"
            value={pm}
            onChange={(event) => setPm(event.target.value)}
            aria-describedby="create-project-pm-hint"
          >
            <option value="">미지정</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.username})
              </option>
            ))}
          </Select>
        </Field>
      </fieldset>
      {save.isError && (
        <p role="alert" className="text-sm text-danger">
          {phase} 저장에 실패했습니다. 프로젝트와 저장된 팀원은 유지됩니다.{" "}
          {settingsErrorMessage(normalizeApiError(save.error))}
        </p>
      )}
      <Button
        type="submit"
        loading={save.isPending}
        className="justify-self-start"
      >
        {save.isError ? "실패한 단계 재시도" : "팀원, PM 저장하고 계속"}
      </Button>
    </form>
  );
}
