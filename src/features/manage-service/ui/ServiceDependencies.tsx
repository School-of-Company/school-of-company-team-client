"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  dependencyKinds,
  kindLabels,
  serviceApi,
  serviceErrorMessage,
  serviceQueries,
  TierLabel,
  type DependencyKind,
  type ServiceDependency,
  type ServiceDetail,
} from "@/entities/service";
import { routes } from "@/shared/config";
import { Button, Dialog, Field, Input, Select, Spinner } from "@/shared/ui";
import { useServiceMutation } from "../api/mutations";
import { ConfirmDialog } from "./ConfirmDialog";

/** 상위 = 이 서비스가 의존하는 서비스(간선은 이 서비스 소유자가 관리), 하위 = 이 서비스에 의존하는 서비스(읽기만). */
export function ServiceDependencies({
  service,
}: {
  readonly service: ServiceDetail;
}) {
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<ServiceDependency | null>(null);
  const remove = useServiceMutation(service.id, (targetId: string) =>
    serviceApi.removeDependency(service.id, targetId),
  );
  return (
    <section aria-labelledby="service-dependencies" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="service-dependencies">의존관계</h2>
        {service.canEdit && (
          <Button
            variant="secondary"
            className="ui-button-sm"
            onClick={() => setAdding(true)}
          >
            의존 추가
          </Button>
        )}
      </div>
      <DependencyGroup
        title="이 서비스가 의존하는 서비스"
        empty="의존하는 서비스가 없습니다."
        items={service.upstream}
        onRemove={
          service.canEdit
            ? (item) => {
                remove.reset();
                setRemoving(item);
              }
            : undefined
        }
      />
      <DependencyGroup
        title="이 서비스에 의존하는 서비스"
        empty="이 서비스에 의존하는 서비스가 없습니다."
        items={service.downstream}
      />
      {adding && (
        <AddDependencyDialog
          service={service}
          onClose={() => setAdding(false)}
        />
      )}
      <ConfirmDialog
        open={removing !== null}
        title="의존관계 삭제"
        description={`이 서비스의 ${removing?.name ?? ""} 의존 기록을 지웁니다. 다시 추가할 수 있습니다.`}
        confirmLabel="삭제"
        pending={remove.isPending}
        error={remove.error ? serviceErrorMessage(remove.error) : undefined}
        onClose={() => !remove.isPending && setRemoving(null)}
        onConfirm={() =>
          removing &&
          remove.mutate(removing.serviceId, {
            onSuccess: () => setRemoving(null),
          })
        }
      />
    </section>
  );
}

function DependencyGroup({
  title,
  empty,
  items,
  onRemove,
}: {
  readonly title: string;
  readonly empty: string;
  readonly items: readonly ServiceDependency[];
  readonly onRemove?: (item: ServiceDependency) => void;
}) {
  return (
    <div className="grid gap-1">
      <h3 className="task-section-title">
        {title} <span className="tabular-nums">{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="service-list">
          {items.map((item) => (
            <li key={item.serviceId} className="service-list-row">
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <Link
                  href={routes.service(item.key)}
                  className="font-medium hover:underline"
                >
                  {item.name}
                </Link>
                <span className="text-xs text-muted">{item.key}</span>
                <TierLabel tier={item.tier} />
                <span className="service-kind" data-kind={item.kind}>
                  {kindLabels[item.kind]}
                </span>
                {item.archived && (
                  <span className="text-xs text-muted">아카이브</span>
                )}
                {item.note && (
                  <span className="w-full text-xs text-muted">{item.note}</span>
                )}
              </div>
              {onRemove && (
                <Button
                  variant="ghost"
                  className="ui-button-sm"
                  onClick={() => onRemove(item)}
                  aria-label={`${item.name} 의존 삭제`}
                >
                  삭제
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddDependencyDialog({
  service,
  onClose,
}: {
  readonly service: ServiceDetail;
  readonly onClose: () => void;
}) {
  const services = useQuery(serviceQueries.list(false));
  const [target, setTarget] = useState("");
  const [kind, setKind] = useState<DependencyKind>("API");
  const [note, setNote] = useState("");
  const add = useServiceMutation(
    service.id,
    (body: { targetServiceId: string; kind: DependencyKind; note?: string }) =>
      serviceApi.addDependency(service.id, body),
  );
  // 아카이브 서비스는 새 의존 대상이 될 수 없고(D6-5), 자기 자신·이미 있는 간선은 뺀다.
  const candidates =
    services.data?.filter(
      (item) =>
        item.id !== service.id &&
        !service.upstream.some((edge) => edge.serviceId === item.id),
    ) ?? [];
  const close = () => !add.isPending && onClose();
  return (
    <Dialog open onClose={close} title="의존 추가" className="service-dialog">
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!target || add.isPending) return;
          add.mutate(
            { targetServiceId: target, kind, note: note.trim() || undefined },
            { onSuccess: onClose },
          );
        }}
      >
        <p className="text-sm text-muted">
          이 서비스가 의존하는 서비스를 고릅니다.
        </p>
        {services.isPending ? (
          <Spinner label="서비스 불러오는 중" />
        ) : services.isError ? (
          <p role="alert" className="text-sm text-danger">
            {serviceErrorMessage(services.error)}
          </p>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-muted">
            더 추가할 수 있는 서비스가 없습니다.
          </p>
        ) : (
          <Field id="dependency-target" label="대상 서비스">
            <Select
              id="dependency-target"
              required
              value={target}
              disabled={add.isPending}
              onChange={(event) => setTarget(event.target.value)}
            >
              <option value="" disabled>
                서비스 선택
              </option>
              {candidates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.key})
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field id="dependency-kind" label="종류">
          <Select
            id="dependency-kind"
            value={kind}
            disabled={add.isPending}
            onChange={(event) =>
              setKind(
                dependencyKinds.find((value) => value === event.target.value) ??
                  "OTHER",
              )
            }
          >
            {dependencyKinds.map((value) => (
              <option key={value} value={value}>
                {kindLabels[value]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="dependency-note" label="메모">
          <Input
            id="dependency-note"
            maxLength={200}
            value={note}
            disabled={add.isPending}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        {add.error ? (
          <p role="alert" className="text-sm text-danger">
            {serviceErrorMessage(add.error)}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" disabled={add.isPending} onClick={close}>
            취소
          </Button>
          <Button type="submit" disabled={!target} loading={add.isPending}>
            추가
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
