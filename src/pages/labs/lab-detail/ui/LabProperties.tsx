"use client";
import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  experimentApi,
  experimentErrorMessage,
  parseLinkTarget,
  type Experiment,
} from "@/entities/experiment";
import { projectQueries } from "@/entities/project";
import { useExperimentMutation } from "@/features/manage-experiment";
import { routes } from "@/shared/config";
import { formatDate } from "@/shared/lib";
import { Button, Icon, Input, Select } from "@/shared/ui";

export function Properties({
  experiment,
}: {
  readonly experiment: Experiment;
}) {
  const projects = useQuery(projectQueries.list());
  const promote = useExperimentMutation((projectId: string | null) =>
    experimentApi.update(experiment.id, { promotedProjectId: projectId }),
  );
  const promoted = projects.data?.find(
    (project) => project.id === experiment.promotedProjectId,
  );
  return (
    <section className="lab-properties" aria-label="실험 속성">
      <dl>
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
    </section>
  );
}

export function Links({ experiment }: { readonly experiment: Experiment }) {
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
      <h2 className="task-section-title">관련 업무와 문서</h2>
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
