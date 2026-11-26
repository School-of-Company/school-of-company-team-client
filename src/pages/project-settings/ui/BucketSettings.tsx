"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { projectQueries, type PlanningBucket } from "@/entities/project";
import { getSettingsPermissions } from "@/features/project-settings";
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Icon,
  IconButton,
  InfoTip,
  Input,
  ListSkeleton,
  StaleNotice,
} from "@/shared/ui";
import { normalizeApiError } from "@/shared/api";
import { settingsErrorMessage } from "@/features/project-settings";
import { usePlanningBuckets } from "../api/buckets";
import { bucketOrderAfterMove } from "../model/bucket-order";
import { validatePartName } from "../model/part-validation";
import type { SettingsProps } from "../model/props";
import { isAccessLost } from "../model/access-lost";
import { MutationFeedback } from "./MutationFeedback";

function validateBucketName(name: string) {
  return (
    validatePartName(name) && "버킷 이름은 공백이 아닌 1~50자로 입력하세요."
  );
}

export function BucketSettings({ project, user }: SettingsProps) {
  const buckets = useQuery(projectQueries.buckets(project.id));
  const change = usePlanningBuckets(project.id);
  const manage = getSettingsPermissions(user, project).manage;
  const [renaming, setRenaming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<PlanningBucket | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const intro = (
    <p className="text-sm text-muted">
      업무를 다음 주기, 보류, 기술 부채처럼 이름 붙인 묶음으로 나눠요.{" "}
      <InfoTip label="버킷 설명">
        상태와 따로 움직이고, 업무 하나는 버킷 하나에만 들어가요. 보드에서
        버킷별로 묶어 보고 레인 사이로 끌어 옮길 수 있어요.
      </InfoTip>
    </p>
  );
  // 안내 문단은 바로 그리고 목록 자리만 빈 상태 높이로 잡아, 버킷이 와도 아래가 밀리지 않는다.
  if (buckets.isPending)
    return (
      <div className="grid gap-5">
        {intro}
        <ListSkeleton label="버킷 불러오는 중" rows={2} rowClassName="h-10" />
      </div>
    );
  if (!buckets.data || (buckets.isError && isAccessLost(buckets.error)))
    return (
      <ErrorState
        title="버킷을 불러오지 못했어요"
        description={settingsErrorMessage(normalizeApiError(buckets.error))}
        onRetry={() => void buckets.refetch()}
      />
    );
  const list = [...buckets.data].sort(
    (left, right) =>
      left.position - right.position || left.id.localeCompare(right.id),
  );
  const active = list.filter((bucket) => !bucket.archived);
  const archived = list.filter((bucket) => bucket.archived);
  function submitName(name: string, bucketId?: string) {
    if (!manage || change.isPending) return;
    const error = validateBucketName(name);
    setValidation(error || null);
    if (error) return;
    change.mutate(
      bucketId
        ? { action: "rename", bucketId, name: name.trim() }
        : { action: "create", name: name.trim() },
      {
        onSuccess: () => {
          if (bucketId) setRenaming(null);
          else setNewName("");
        },
      },
    );
  }
  function row(bucket: PlanningBucket, index: number) {
    if (renaming === bucket.id && manage)
      return (
        <li key={bucket.id} className="bucket-row">
          <form
            className="bucket-rename"
            onSubmit={(event) => {
              event.preventDefault();
              submitName(
                String(new FormData(event.currentTarget).get("name") ?? ""),
                bucket.id,
              );
            }}
          >
            <Input
              name="name"
              aria-label={`${bucket.name} 새 이름`}
              defaultValue={bucket.name}
              maxLength={50}
              required
              autoFocus
              disabled={change.isPending}
            />
            <Button
              type="submit"
              variant="secondary"
              className="ui-button-sm"
              loading={change.isPending}
            >
              저장
            </Button>
            <Button
              variant="ghost"
              className="ui-button-sm"
              disabled={change.isPending}
              onClick={() => setRenaming(null)}
            >
              취소
            </Button>
          </form>
        </li>
      );
    return (
      <li key={bucket.id} className="bucket-row">
        {manage && !bucket.archived && (
          <span className="bucket-order">
            <IconButton
              variant="ghost"
              aria-label={`${bucket.name} 위로`}
              disabled={change.isPending || index === 0}
              onClick={() => {
                const bucketIds = bucketOrderAfterMove(list, bucket.id, -1);
                if (bucketIds) change.mutate({ action: "order", bucketIds });
              }}
            >
              <Icon name="chevronDown" className="rotate-180" />
            </IconButton>
            <IconButton
              variant="ghost"
              aria-label={`${bucket.name} 아래로`}
              disabled={change.isPending || index === active.length - 1}
              onClick={() => {
                const bucketIds = bucketOrderAfterMove(list, bucket.id, 1);
                if (bucketIds) change.mutate({ action: "order", bucketIds });
              }}
            >
              <Icon name="chevronDown" />
            </IconButton>
          </span>
        )}
        <span className="bucket-name">{bucket.name}</span>
        {bucket.archived && <Badge>보관됨</Badge>}
        {manage && (
          <span className="bucket-actions">
            <Button
              variant="ghost"
              className="ui-button-sm"
              disabled={change.isPending}
              onClick={() => {
                setValidation(null);
                setRenaming(bucket.id);
              }}
            >
              이름 변경
            </Button>
            <Button
              variant="ghost"
              className="ui-button-sm"
              disabled={change.isPending}
              onClick={() =>
                change.mutate({
                  action: "archive",
                  bucketId: bucket.id,
                  archived: !bucket.archived,
                })
              }
            >
              {bucket.archived ? "복원" : "보관"}
            </Button>
            <Button
              variant="ghost"
              className="ui-button-sm"
              disabled={change.isPending}
              aria-label={`${bucket.name} 버킷 삭제`}
              onClick={() => setDeleting(bucket)}
            >
              삭제
            </Button>
          </span>
        )}
      </li>
    );
  }
  return (
    <div className="grid gap-5">
      {intro}
      <StaleNotice query={buckets} />
      {list.length === 0 ? (
        <EmptyState
          title="아직 버킷이 없어요"
          description={
            manage
              ? "아래에 이름을 적고 버킷 추가를 누르면 첫 버킷이 생겨요."
              : "헤드 어드민 또는 PM이 만들면 여기에 보여요."
          }
        />
      ) : (
        <>
          {active.length > 0 && (
            <ul className="bucket-list" aria-label="사용 중인 버킷">
              {active.map(row)}
            </ul>
          )}
          {archived.length > 0 && (
            <section className="grid gap-2" aria-labelledby="archived-buckets">
              <h3
                id="archived-buckets"
                className="text-sm font-medium text-muted"
              >
                보관된 버킷
              </h3>
              <p className="text-xs text-muted">
                기존 배정은 남고, 새 업무를 넣을 수는 없어요.
              </p>
              <ul className="bucket-list">{archived.map(row)}</ul>
            </section>
          )}
        </>
      )}
      {manage && (
        <form
          className="bucket-create"
          onSubmit={(event) => {
            event.preventDefault();
            submitName(newName);
          }}
        >
          <Field id="new-bucket" label="새 버킷 이름">
            <Input
              id="new-bucket"
              name="name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              maxLength={50}
              required
              disabled={change.isPending}
            />
          </Field>
          <Button type="submit" variant="secondary" loading={change.isPending}>
            버킷 추가
          </Button>
        </form>
      )}
      {validation && (
        <p role="alert" className="text-sm text-danger">
          {validation}
        </p>
      )}
      <MutationFeedback error={change.error} success={change.isSuccess} />
      <Dialog
        open={!!deleting}
        onClose={() => {
          if (!change.isPending) setDeleting(null);
        }}
        title="버킷을 삭제할까요?"
      >
        <p className="mb-6 text-sm text-muted">
          {deleting?.name} 버킷을 삭제해도 업무는 그대로 남고 버킷 배정만
          풀려요. 기록을 남기려면 삭제 대신 보관하세요.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            disabled={change.isPending}
            onClick={() => setDeleting(null)}
          >
            취소
          </Button>
          <Button
            variant="danger"
            loading={change.isPending}
            onClick={() => {
              if (!deleting || change.isPending) return;
              change.mutate(
                { action: "delete", bucketId: deleting.id },
                { onSettled: () => setDeleting(null) },
              );
            }}
          >
            삭제
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
