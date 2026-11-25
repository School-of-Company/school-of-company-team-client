"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kindLabels } from "@/entities/knowledge";
import { statusLabels } from "@/entities/task";
import {
  WHITEBOARD_LINK_LIMIT,
  whiteboardApi,
  whiteboardErrorMessage,
  whiteboardKeys,
  whiteboardQueries,
  type WhiteboardLinks,
} from "@/entities/whiteboard";
import { routes } from "@/shared/config";
import {
  Button,
  ErrorState,
  Icon,
  IconButton,
  Input,
  Skeleton,
  useToast,
} from "@/shared/ui";

type TargetType = "TASK" | "DOCUMENT";

/**
 * 화이트보드와 업무, 문서 연결(D16-8~D16-10). 캔버스 요소의 link 와는 따로다.
 * 목록에는 내가 읽을 수 있는 대상만 나온다. 상한 50개는 못 보는 연결까지 센 서버 값이라, 화면 개수는 참고용이다.
 */
export function LinksPanel({
  whiteboardId,
  canEdit,
  onClose,
}: {
  readonly whiteboardId: string;
  readonly canEdit: boolean;
  readonly onClose: () => void;
}) {
  const client = useQueryClient();
  const toast = useToast();
  const links = useQuery(whiteboardQueries.links(whiteboardId));
  const onError = (error: unknown) =>
    toast(whiteboardErrorMessage(error), "error");
  const add = useMutation({
    mutationFn: (target: { type: TargetType; id: string }) =>
      whiteboardApi.addLink(
        whiteboardId,
        target.type === "TASK"
          ? { taskId: target.id }
          : { documentId: target.id },
      ),
    onSuccess: (next) =>
      client.setQueryData(whiteboardKeys.links(whiteboardId), next),
    onError,
  });
  const remove = useMutation({
    mutationFn: (linkId: string) =>
      whiteboardApi.removeLink(whiteboardId, linkId),
    onSuccess: (_, linkId) =>
      client.setQueryData<WhiteboardLinks>(
        whiteboardKeys.links(whiteboardId),
        (current) =>
          current && {
            tasks: current.tasks.filter((link) => link.linkId !== linkId),
            documents: current.documents.filter(
              (link) => link.linkId !== linkId,
            ),
          },
      ),
    onError: (error) => {
      onError(error);
      void client.invalidateQueries({
        queryKey: whiteboardKeys.links(whiteboardId),
      });
    },
  });
  const data = links.data;
  const total = data ? data.tasks.length + data.documents.length : 0;
  const full = total >= WHITEBOARD_LINK_LIMIT;
  const linked = new Set([
    ...(data?.tasks.map((link) => link.task.id) ?? []),
    ...(data?.documents.map((link) => link.document.id) ?? []),
  ]);
  const picker = (type: TargetType) =>
    canEdit &&
    data && (
      <TargetPicker
        type={type}
        disabled={full}
        linked={linked}
        pending={add.isPending}
        onPick={(id) => add.mutate({ type, id })}
      />
    );
  return (
    <aside
      className="whiteboard-panel grid content-start gap-4"
      aria-label="연결"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">
          연결{" "}
          {data && (
            <span className="text-sm font-normal text-muted tabular-nums">
              {total}/{WHITEBOARD_LINK_LIMIT}
            </span>
          )}
        </h2>
        <IconButton aria-label="연결 닫기" variant="ghost" onClick={onClose}>
          <Icon name="close" />
        </IconButton>
      </div>
      {links.isPending ? (
        <Skeleton className="h-40" />
      ) : !data ? (
        <ErrorState
          description={whiteboardErrorMessage(links.error)}
          onRetry={() => void links.refetch()}
        />
      ) : (
        <>
          {full && canEdit && (
            <p role="status" className="text-sm text-muted">
              {WHITEBOARD_LINK_LIMIT}개까지 연결할 수 있습니다. 하나를 끊은 뒤
              더하세요.
            </p>
          )}
          <section className="grid gap-2" aria-labelledby="links-tasks">
            <h3 id="links-tasks" className="text-sm font-semibold">
              업무
            </h3>
            {data.tasks.length === 0 ? (
              <p className="text-sm text-muted">연결된 업무가 없습니다.</p>
            ) : (
              <ul className="grid gap-1">
                {data.tasks.map(({ linkId, task }) => (
                  <LinkRow
                    key={linkId}
                    href={task.id ? routes.task(task.id) : undefined}
                    title={task.title ?? "볼 수 없는 업무"}
                    meta={[
                      task.key,
                      task.status ? statusLabels[task.status] : null,
                    ]}
                    canEdit={canEdit}
                    onRemove={() => remove.mutate(linkId)}
                  />
                ))}
              </ul>
            )}
            {picker("TASK")}
          </section>
          <section className="grid gap-2" aria-labelledby="links-documents">
            <h3 id="links-documents" className="text-sm font-semibold">
              문서
            </h3>
            {data.documents.length === 0 ? (
              <p className="text-sm text-muted">연결된 문서가 없습니다.</p>
            ) : (
              <ul className="grid gap-1">
                {data.documents.map(({ linkId, document }) => (
                  <LinkRow
                    key={linkId}
                    href={routes.doc(document.id)}
                    title={document.title}
                    meta={[
                      kindLabels[document.kind] ?? null,
                      document.project?.key ?? null,
                    ]}
                    canEdit={canEdit}
                    onRemove={() => remove.mutate(linkId)}
                  />
                ))}
              </ul>
            )}
            {picker("DOCUMENT")}
          </section>
        </>
      )}
    </aside>
  );
}

function LinkRow({
  href,
  title,
  meta,
  canEdit,
  onRemove,
}: {
  readonly href: string | undefined;
  readonly title: string;
  readonly meta: readonly (string | null)[];
  readonly canEdit: boolean;
  readonly onRemove: () => void;
}) {
  return (
    <li className="whiteboard-comment flex items-center gap-2">
      <span className="grid min-w-0 flex-1">
        {href ? (
          <Link href={href} className="truncate font-medium hover:underline">
            {title}
          </Link>
        ) : (
          <span className="truncate font-medium">{title}</span>
        )}
        <span className="flex gap-2 text-xs text-muted">
          {meta.filter(Boolean).map((value) => (
            <span key={value}>{value}</span>
          ))}
        </span>
      </span>
      {canEdit && (
        <IconButton
          aria-label={`${title} 연결 끊기`}
          variant="ghost"
          onClick={onRemove}
        >
          <Icon name="close" />
        </IconButton>
      )}
    </li>
  );
}

function TargetPicker({
  type,
  disabled,
  linked,
  pending,
  onPick,
}: {
  readonly type: TargetType;
  readonly disabled: boolean;
  readonly linked: ReadonlySet<string | null>;
  readonly pending: boolean;
  readonly onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim());
  const candidates = useQuery(whiteboardQueries.linkCandidates(type, deferred));
  const noun = type === "TASK" ? "업무" : "문서";
  const id = `link-search-${type}`;
  const results = candidates.data?.filter((item) => !linked.has(item.id));
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="sr-only">
        연결할 {noun} 찾기
      </label>
      <Input
        id={id}
        type="search"
        value={query}
        disabled={disabled}
        placeholder={`${noun} 제목${type === "TASK" ? "이나 키" : ""}로 찾기`}
        onChange={(event) => setQuery(event.target.value)}
      />
      {deferred &&
        (candidates.isError ? (
          <p role="alert" className="text-sm text-danger">
            {whiteboardErrorMessage(candidates.error)}
          </p>
        ) : results && results.length === 0 && !candidates.isFetching ? (
          <p className="text-sm text-muted">연결할 {noun}가 없습니다.</p>
        ) : (
          <ul
            className="grid gap-1"
            aria-label={`${noun} 검색 결과`}
            aria-busy={candidates.isFetching}
          >
            {results?.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <span className="grid min-w-0 flex-1">
                  <span className="truncate text-sm">{item.title}</span>
                  {(item.key || item.context) && (
                    <span className="truncate text-xs text-muted">
                      {[item.key, item.context].filter(Boolean).join(" ")}
                    </span>
                  )}
                </span>
                <Button
                  variant="secondary"
                  className="ui-button-sm"
                  disabled={pending || disabled}
                  onClick={() => {
                    onPick(item.id);
                    setQuery("");
                  }}
                >
                  연결
                </Button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
