"use client";

import Link from "next/link";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  incidentQueries,
  IncidentStatusLabel,
  SeverityLabel,
} from "@/entities/incident";
import {
  KindLabel,
  knowledgeApi,
  knowledgeErrorMessage,
  knowledgeQueries,
  relationLabels,
  type AddKnowledgeLink,
  type KnowledgeDetail,
  type KnowledgeRelation,
} from "@/entities/knowledge";
import { serviceQueries } from "@/entities/service";
import { statusLabels } from "@/entities/task";
import { routes } from "@/shared/config";
import {
  Button,
  Dialog,
  Field,
  IconButton,
  Icon,
  Input,
  Select,
  Spinner,
} from "@/shared/ui";
import { useKnowledgeMutation } from "../api/mutations";
import { parseTaskRef } from "../model/task-ref";

type Target = "service" | "incident" | "task" | "document";
const targetLabels: Readonly<Record<Target, string>> = {
  service: "서비스",
  incident: "사고",
  task: "업무",
  document: "문서",
};

/** 상세 속성 열의 관계 칸. 나가는 관계(서비스·사고·업무·문서)와 이 문서를 가리키는 문서를 나눠 보인다. */
export function DocumentLinks({
  document,
}: {
  readonly document: KnowledgeDetail;
}) {
  const [adding, setAdding] = useState(false);
  const remove = useKnowledgeMutation((linkId: string) =>
    knowledgeApi.removeLink(document.id, linkId),
  );
  const { links } = document;
  const removeButton = (linkId: string, label: string) =>
    document.canEdit ? (
      <IconButton
        aria-label={`${label} 연결 해제`}
        variant="ghost"
        className="ui-button-sm"
        disabled={remove.isPending}
        onClick={() => {
          if (!remove.isPending) remove.mutate(linkId);
        }}
      >
        <Icon name="close" width={14} height={14} />
      </IconButton>
    ) : null;
  const total =
    links.services.length +
    links.incidents.length +
    links.tasks.length +
    links.documents.length;
  return (
    <section aria-labelledby="doc-links" className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="doc-links" className="text-sm font-semibold">
          관계{" "}
          <span className="font-normal text-muted tabular-nums">{total}</span>
        </h2>
        {document.canEdit && (
          <Button
            variant="ghost"
            className="ui-button-sm"
            onClick={() => setAdding(true)}
          >
            <Icon name="plus" width={16} height={16} className="inline-block" />{" "}
            연결
          </Button>
        )}
      </div>
      {total === 0 && links.referencedBy.length === 0 && (
        <p className="text-sm text-muted">
          연결된 서비스, 사고, 업무, 문서가 없습니다.
        </p>
      )}
      <LinkGroup title="서비스" count={links.services.length}>
        {links.services.map(({ linkId, service }) => (
          <li key={linkId}>
            <Link href={routes.service(service.key)} className="doc-link-main">
              <span className="truncate">{service.name}</span>
              <span className="text-xs text-muted">
                {service.key}
                {service.archived ? ", 아카이브" : ""}
              </span>
            </Link>
            {removeButton(linkId, service.name)}
          </li>
        ))}
      </LinkGroup>
      <LinkGroup title="사고" count={links.incidents.length}>
        {links.incidents.map((incident) => (
          <li key={incident.linkId}>
            <Link
              href={routes.incident(incident.incidentId)}
              className="doc-link-main"
            >
              <span className="truncate">{incident.title}</span>
              <span className="flex items-center gap-2">
                <SeverityLabel severity={incident.severity} />
                <IncidentStatusLabel status={incident.status} />
              </span>
            </Link>
            {removeButton(incident.linkId, incident.title)}
          </li>
        ))}
      </LinkGroup>
      <LinkGroup title="업무" count={links.tasks.length}>
        {links.tasks.map(({ linkId, task }) =>
          task.id ? (
            <li key={linkId}>
              <Link href={routes.task(task.id)} className="doc-link-main">
                <span className="truncate">{task.title}</span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  {task.status && (
                    <span
                      className="status-icon"
                      data-status={task.status}
                      aria-hidden="true"
                    />
                  )}
                  <span className="font-mono">{task.key ?? "팀 공용"}</span>
                  {task.status ? statusLabels[task.status] : ""}
                </span>
              </Link>
              {removeButton(linkId, task.title ?? "업무")}
            </li>
          ) : null,
        )}
      </LinkGroup>
      <LinkGroup title="문서" count={links.documents.length}>
        {links.documents.map(({ linkId, relation, document: target }) => (
          <li key={linkId}>
            <Link href={routes.doc(target.id)} className="doc-link-main">
              <span className="truncate">{target.title}</span>
              <span className="flex items-center gap-2 text-xs text-muted">
                <KindLabel kind={target.kind} />
                {relation === "SUPERSEDES" ? "이 문서가 대체" : "참고"}
              </span>
            </Link>
            {removeButton(linkId, target.title)}
          </li>
        ))}
      </LinkGroup>
      <LinkGroup
        title="이 문서를 가리키는 문서"
        count={links.referencedBy.length}
      >
        {links.referencedBy.map(({ linkId, relation, document: source }) => (
          <li key={linkId}>
            <Link href={routes.doc(source.id)} className="doc-link-main">
              <span className="truncate">{source.title}</span>
              <span className="flex items-center gap-2 text-xs text-muted">
                <KindLabel kind={source.kind} />
                {relation === "SUPERSEDES" ? "이 문서를 대체" : "참고"}
              </span>
            </Link>
          </li>
        ))}
      </LinkGroup>
      {remove.error ? (
        <p role="alert" className="text-sm text-danger">
          {knowledgeErrorMessage(remove.error)}
        </p>
      ) : null}
      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="관계 연결"
        className="incident-dialog"
      >
        {adding && (
          <AddLinkForm document={document} onClose={() => setAdding(false)} />
        )}
      </Dialog>
    </section>
  );
}

function LinkGroup({
  title,
  count,
  children,
}: {
  readonly title: string;
  readonly count: number;
  readonly children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="grid gap-1">
      <h3 className="text-xs text-muted">{title}</h3>
      <ul className="doc-links">{children}</ul>
    </div>
  );
}

function AddLinkForm({
  document,
  onClose,
}: {
  readonly document: KnowledgeDetail;
  readonly onClose: () => void;
}) {
  const id = useId();
  const [target, setTarget] = useState<Target>("service");
  const [value, setValue] = useState("");
  const [relation, setRelation] = useState<KnowledgeRelation>("REFERENCES");
  const [error, setError] = useState("");
  const services = useQuery({
    ...serviceQueries.list(false),
    enabled: target === "service",
  });
  const incidents = useQuery({
    ...incidentQueries.list({ statuses: [] }),
    enabled: target === "incident",
  });
  const documents = useQuery({
    ...knowledgeQueries.list({}),
    enabled: target === "document",
  });
  const add = useKnowledgeMutation((body: AddKnowledgeLink) =>
    knowledgeApi.addLink(document.id, body),
  );
  const linked = {
    service: new Set(document.links.services.map((link) => link.service.id)),
    incident: new Set(document.links.incidents.map((link) => link.incidentId)),
    document: new Set(document.links.documents.map((link) => link.document.id)),
  };
  const options: readonly { readonly id: string; readonly label: string }[] =
    target === "service"
      ? (services.data ?? [])
          .filter((service) => !linked.service.has(service.id))
          .map((service) => ({
            id: service.id,
            label: `${service.name} (${service.key})`,
          }))
      : target === "incident"
        ? (incidents.data ?? [])
            .filter((incident) => !linked.incident.has(incident.id))
            .map((incident) => ({
              id: incident.id,
              label: `[${incident.severity}] ${incident.title}`,
            }))
        : target === "document"
          ? (documents.data ?? [])
              .filter(
                (candidate) =>
                  candidate.id !== document.id &&
                  !linked.document.has(candidate.id),
              )
              .map((candidate) => ({
                id: candidate.id,
                label: `${candidate.kind} ${candidate.title}`,
              }))
          : [];
  const loading =
    (target === "service" && services.isPending) ||
    (target === "incident" && incidents.isPending) ||
    (target === "document" && documents.isPending);
  const loadError =
    (target === "service" && services.error) ||
    (target === "incident" && incidents.error) ||
    (target === "document" && documents.error);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (add.isPending) return;
    let body: AddKnowledgeLink;
    if (target === "task") {
      const taskId = parseTaskRef(value);
      if (!taskId) {
        setError("업무 화면 주소나 업무 ID를 붙여 넣으세요.");
        return;
      }
      body = { taskId };
    } else {
      if (!value) {
        setError(`${targetLabels[target]}를 고르세요.`);
        return;
      }
      body =
        target === "service"
          ? { serviceId: value }
          : target === "incident"
            ? { incidentId: value }
            : { documentId: value, relation };
    }
    setError("");
    add.mutate(body, { onSuccess: onClose });
  };
  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">대상</legend>
        <div className="ui-segmented justify-self-start">
          {(Object.keys(targetLabels) as Target[]).map((option) => (
            <label key={option} className="ui-segmented-option">
              <input
                type="radio"
                name={`${id}-target`}
                value={option}
                checked={target === option}
                onChange={() => {
                  setTarget(option);
                  setValue("");
                  setError("");
                }}
              />
              {targetLabels[option]}
            </label>
          ))}
        </div>
      </fieldset>
      {target === "task" ? (
        <Field
          id={`${id}-task`}
          label="업무 주소 또는 ID"
          hint="업무 화면 주소를 붙여 넣으세요. 개인 업무와 볼 수 없는 업무는 연결되지 않습니다."
          error={error}
        >
          <Input
            id={`${id}-task`}
            value={value}
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-task-hint${error ? ` ${id}-task-error` : ""}`}
            placeholder="/tasks/01J…"
            onChange={(event) => setValue(event.target.value)}
          />
        </Field>
      ) : loading ? (
        <Spinner label={`${targetLabels[target]} 불러오는 중`} />
      ) : loadError ? (
        <p role="alert" className="text-sm text-danger">
          목록을 불러오지 못했습니다. 잠시 후 다시 열어 주세요.
        </p>
      ) : options.length === 0 ? (
        <p className="text-sm text-muted">
          연결할 수 있는 {targetLabels[target]}가 없습니다.
        </p>
      ) : (
        <Field id={`${id}-value`} label={targetLabels[target]} error={error}>
          <Select
            id={`${id}-value`}
            value={value}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-value-error` : undefined}
            onChange={(event) => setValue(event.target.value)}
          >
            <option value="" disabled>
              {targetLabels[target]} 선택
            </option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {target === "document" && options.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">관계</legend>
          <div className="ui-segmented justify-self-start">
            {(["REFERENCES", "SUPERSEDES"] as const).map((option) => (
              <label key={option} className="ui-segmented-option">
                <input
                  type="radio"
                  name={`${id}-relation`}
                  value={option}
                  checked={relation === option}
                  onChange={() => setRelation(option)}
                />
                {relationLabels[option]}
              </label>
            ))}
          </div>
          {relation === "SUPERSEDES" && (
            <p className="text-sm text-muted">
              이 문서가 고른 문서를 대체합니다. 고른 문서의 상태는 바꾸지 않으니
              필요하면 직접 폐기로 바꾸세요.
            </p>
          )}
        </fieldset>
      )}
      {add.error ? (
        <p role="alert" className="text-sm text-danger">
          {knowledgeErrorMessage(add.error)}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" disabled={add.isPending} onClick={onClose}>
          취소
        </Button>
        <Button type="submit" loading={add.isPending}>
          연결
        </Button>
      </div>
    </form>
  );
}
