"use client";

import { useState, type DragEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLastData } from "@/shared/lib";
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  Skeleton,
  StaleNotice,
  useToast,
} from "@/shared/ui";
import { projectLinkQueries, useLinkChange } from "../api/links";
import { moveLink } from "../model/link-form";
import {
  linkErrorMessage,
  linkKindLabels,
  linkSummary,
  type ProjectLink,
} from "../model/links";
import { LinkFormDialog, LinkPreviewDialog } from "./LinkDialogs";
import { LinkKindIcon } from "./LinkKindIcon";
import { ProjectFrame, type PlanningContext } from "./ProjectFrame";

/** 프로젝트 탭 "링크": 자주 여는 문서·디자인·배포 주소를 카드로 모은다(서버 계약 2절). */
export function LinkListPage({ projectId }: { readonly projectId: string }) {
  return (
    <ProjectFrame projectId={projectId}>
      {(context) => <LinkBoard {...context} />}
    </ProjectFrame>
  );
}

// 추가 버튼은 프로젝트 쓰기 권한(참여자·PM·헤드 어드민, 아카이브 아님)으로, 카드 동작은 서버의 canEdit·canDelete로 정한다.
function LinkBoard({ project, writes }: PlanningContext) {
  const toast = useToast();
  const query = useQuery(projectLinkQueries.list(project.id));
  const { data: links, stale } = useLastData(query);
  const change = useLinkChange(project.id);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ProjectLink | null>(null);
  const [deleting, setDeleting] = useState<ProjectLink | null>(null);
  const [previewing, setPreviewing] = useState<ProjectLink | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);

  const run = (...args: Parameters<typeof change.mutate>) =>
    change.mutate(args[0], {
      onError: (error) => toast(linkErrorMessage(error), "error"),
      ...args[1],
    });
  const reorder = (id: string, index: number) => {
    if (!links || change.isPending) return;
    const linkIds = moveLink(
      links.map((link) => link.id),
      id,
      index,
    );
    if (linkIds) run({ action: "order", linkIds });
  };

  const head = (
    <div className="planning-section-head">
      <h2 className="planning-subhead">
        링크
        {links && <span className="tabular-nums">{links.length}</span>}
      </h2>
      {writes && (
        <Button onClick={() => setAdding(true)}>
          <Icon name="plus" className="inline-block" /> 링크 추가
        </Button>
      )}
    </div>
  );

  if (query.isPending)
    return (
      <section className="grid gap-4" aria-label="링크">
        {head}
        {/* 빈 상태 높이부터 시작하는 카드 격자(ListSkeleton과 같은 규칙). */}
        <div
          role="status"
          aria-label="링크 불러오는 중"
          className="link-grid ui-skeleton-list"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      </section>
    );

  return (
    <section className="grid gap-4" aria-label="링크">
      {head}
      {!links ? (
        <ErrorState
          title="링크를 불러오지 못했어요"
          description={linkErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : links.length === 0 ? (
        <EmptyState
          title="링크가 없어요"
          description={
            writes
              ? "기획 문서, 디자인, 배포 주소처럼 자주 여는 링크를 모아 둬요."
              : "아직 모아 둔 링크가 없어요."
          }
        />
      ) : (
        <>
          {stale && <StaleNotice query={query} />}
          {links.some((link) => link.canEdit) && links.length > 1 && (
            <p className="planning-note">
              카드를 끌거나 앞, 뒤 버튼으로 순서를 바꿔요.
            </p>
          )}
          <ul className="link-grid" aria-label="링크 목록">
            {links.map((link, index) => {
              const movable = link.canEdit && links.length > 1;
              const dragProps = movable
                ? {
                    draggable: true,
                    onDragStart: (event: DragEvent<HTMLLIElement>) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", link.id);
                      setDragId(link.id);
                    },
                    onDragEnd: () => {
                      setDragId(null);
                      setDropId(null);
                    },
                    onDragOver: (event: DragEvent) => {
                      if (!dragId || dragId === link.id) return;
                      event.preventDefault();
                      setDropId(link.id);
                    },
                    onDragLeave: () => setDropId(null),
                    onDrop: (event: DragEvent) => {
                      event.preventDefault();
                      if (dragId) reorder(dragId, index);
                      setDragId(null);
                      setDropId(null);
                    },
                  }
                : {};
              return (
                <li
                  key={link.id}
                  className="link-card"
                  data-dragging={dragId === link.id || undefined}
                  data-dropping={dropId === link.id || undefined}
                  {...dragProps}
                >
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-card-main"
                    draggable={false}
                  >
                    <span
                      className="link-kind"
                      title={linkKindLabels[link.kind]}
                    >
                      <LinkKindIcon kind={link.kind} />
                    </span>
                    <span className="link-card-text">
                      <span className="link-card-title">{link.title}</span>
                      <span className="link-card-summary">
                        {linkSummary(link)}
                      </span>
                      <span className="link-card-host">{link.host}</span>
                    </span>
                    <span className="sr-only">
                      ({linkKindLabels[link.kind]}, 새 탭에서 열림)
                    </span>
                  </a>
                  <div className="link-card-foot">
                    {link.label ? <Badge>{link.label}</Badge> : <span />}
                    <span className="link-card-actions">
                      {link.embed && (
                        <Button
                          variant="ghost"
                          className="ui-button-sm"
                          onClick={() => setPreviewing(link)}
                        >
                          미리보기
                        </Button>
                      )}
                      {link.canEdit &&
                        (link.meta.status === "OK" ||
                          link.meta.status === "FAILED") && (
                          <Button
                            variant="ghost"
                            className="ui-button-sm"
                            disabled={change.isPending}
                            aria-label={`${link.title} 정보 새로 고침`}
                            onClick={() =>
                              run(
                                { action: "refresh", linkId: link.id },
                                {
                                  onSuccess: () =>
                                    toast(
                                      "페이지 정보를 다시 가져와요.",
                                      "success",
                                    ),
                                },
                              )
                            }
                          >
                            새로 고침
                          </Button>
                        )}
                      {link.canEdit && (
                        <Button
                          variant="ghost"
                          className="ui-button-sm"
                          aria-label={`${link.title} 수정`}
                          onClick={() => setEditing(link)}
                        >
                          수정
                        </Button>
                      )}
                      {link.canDelete && (
                        <Button
                          variant="ghost"
                          className="ui-button-sm"
                          aria-label={`${link.title} 삭제`}
                          onClick={() => setDeleting(link)}
                        >
                          삭제
                        </Button>
                      )}
                      {movable && (
                        <>
                          <IconButton
                            variant="ghost"
                            aria-label={`${link.title} 앞으로`}
                            disabled={change.isPending || index === 0}
                            onClick={() => reorder(link.id, index - 1)}
                          >
                            <Icon name="chevronLeft" />
                          </IconButton>
                          <IconButton
                            variant="ghost"
                            aria-label={`${link.title} 뒤로`}
                            disabled={
                              change.isPending || index === links.length - 1
                            }
                            onClick={() => reorder(link.id, index + 1)}
                          >
                            <Icon name="chevronLeft" className="rotate-180" />
                          </IconButton>
                        </>
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <LinkFormDialog
        open={adding || !!editing}
        projectId={project.id}
        link={editing ?? undefined}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />
      <LinkPreviewDialog
        link={previewing}
        onClose={() => setPreviewing(null)}
      />
      <Dialog
        open={!!deleting}
        onClose={() => {
          if (!change.isPending) setDeleting(null);
        }}
        title="링크를 삭제할까요?"
      >
        <p className="mb-6 text-sm text-muted">
          {deleting?.title} 링크를 목록에서 지워요. 되돌릴 수 없어요.
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
              run(
                { action: "delete", linkId: deleting.id },
                { onSettled: () => setDeleting(null) },
              );
            }}
          >
            삭제
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
