"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectAccess, projectQueries } from "@/entities/project";
import type { User } from "@/entities/user";
import {
  WHITEBOARD_TITLE_MAX,
  whiteboardApi,
  whiteboardErrorMessage,
  whiteboardKeys,
  whiteboardQueries,
  TemplatePicker,
  type WhiteboardSummary,
  type WhiteboardTemplate,
} from "@/entities/whiteboard";
import { isHeadAdmin } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import {
  DeleteTemplateDialog,
  TemplateFormDialog,
} from "@/features/manage-whiteboard-template";
import { normalizeApiError } from "@/shared/api";
import { routes } from "@/shared/config";
import { formatDate } from "@/shared/lib";
import {
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Icon,
  Input,
  ListSkeleton,
  PageHeader,
  QueryState,
  Skeleton,
  useToast,
} from "@/shared/ui";
import { ProjectHeading, ProjectHeadingSkeleton } from "@/widgets/project-nav";

/** projectId 가 없으면 팀 공용 화이트보드 목록(`/whiteboards`), 있으면 프로젝트 탭. */
export function WhiteboardListPage({
  projectId,
}: {
  readonly projectId?: string;
}) {
  return (
    <AuthGuard
      require="work"
      fallback={projectId ? <ProjectHeadingSkeleton /> : undefined}
    >
      {(user) =>
        projectId ? (
          <ProjectWhiteboards projectId={projectId} user={user} />
        ) : (
          <Boards projectId={null} canCreate user={user} />
        )
      }
    </AuthGuard>
  );
}

function ProjectWhiteboards({
  projectId,
  user,
}: {
  readonly projectId: string;
  readonly user: User;
}) {
  const project = useQuery(projectQueries.detail(projectId));
  if (project.isPending) return <ProjectHeadingSkeleton />;
  if (project.isError)
    return (
      <ErrorState
        description={whiteboardErrorMessage(project.error)}
        onRetry={() => void project.refetch()}
      />
    );
  return (
    <div className="planning-page grid min-w-0 gap-6">
      <ProjectHeading project={project.data} user={user} />
      <Boards
        projectId={projectId}
        canCreate={projectAccess(project.data, user).editable}
        user={user}
      />
    </div>
  );
}

function Boards({
  projectId,
  canCreate,
  user,
}: {
  readonly projectId: string | null;
  readonly canCreate: boolean;
  readonly user: User;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const boards = useQuery(whiteboardQueries.list(projectId));
  const createButton = canCreate && (
    <Button onClick={() => setCreating(true)}>
      <Icon name="plus" className="inline-block" /> 새 화이트보드
    </Button>
  );
  return (
    <section className="grid gap-5">
      {projectId ? (
        <div className="planning-section-head">
          <h2 id="whiteboards-heading" className="text-lg font-semibold">
            화이트보드
          </h2>
          {createButton}
        </div>
      ) : (
        <PageHeader
          title="화이트보드"
          subtitle="팀원 누구나 고칠 수 있어요"
          actions={createButton}
        />
      )}
      <QueryState
        query={boards}
        skeleton={
          <ListSkeleton label="화이트보드 불러오는 중" rowClassName="h-14" />
        }
        errorMessage={whiteboardErrorMessage}
        empty={
          <EmptyState
            title="화이트보드가 없습니다"
            description="회의, 계획, 다이어그램 템플릿으로 바로 시작할 수 있습니다."
          />
        }
      >
        {(data) => (
          <ul className="list" aria-label="화이트보드 목록">
            {data.map((board) => (
              <BoardRow key={board.id} board={board} />
            ))}
          </ul>
        )}
      </QueryState>
      <CreateDialog
        open={creating}
        projectId={projectId}
        canManageTemplates={isHeadAdmin(user)}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          setCreating(false);
          router.push(routes.whiteboard(id));
        }}
      />
    </section>
  );
}

function BoardRow({ board }: { readonly board: WhiteboardSummary }) {
  return (
    <li className="list-row">
      <Icon name="pen" className="shrink-0 text-faint" />
      <Link href={routes.whiteboard(board.id)} className="list-row-main">
        <span className="list-row-title">{board.title}</span>
      </Link>
      <span className="list-row-meta">
        {!board.canEdit && <span>보기 전용</span>}
        {board.updatedBy && <span>{board.updatedBy.name}</span>}
        <span className="tabular-nums">
          {formatDate(board.updatedAt, { year: undefined })}
        </span>
      </span>
    </li>
  );
}

function CreateDialog({
  open,
  projectId,
  canManageTemplates,
  onClose,
  onCreated,
}: {
  readonly open: boolean;
  readonly projectId: string | null;
  readonly canManageTemplates: boolean;
  readonly onClose: () => void;
  readonly onCreated: (id: string) => void;
}) {
  const client = useQueryClient();
  const toast = useToast();
  const templates = useQuery({
    ...whiteboardQueries.templates(),
    enabled: open,
  });
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("BLANK");
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState<WhiteboardTemplate | null>(null);
  const [deleting, setDeleting] = useState<WhiteboardTemplate | null>(null);
  const create = useMutation({
    mutationFn: () =>
      whiteboardApi.create({ projectId, title: title.trim(), templateId }),
    onSuccess: async (board) => {
      client.setQueryData(whiteboardKeys.detail(board.id), board);
      await client.invalidateQueries({
        queryKey: whiteboardKeys.list(projectId),
      });
      setTitle("");
      setTemplateId("BLANK");
      onCreated(board.id);
    },
    onError: (failure) => {
      toast(whiteboardErrorMessage(failure), "error");
      // 고른 팀 템플릿이 그사이 지워졌다. 목록을 새로 받는다.
      if (normalizeApiError(failure).code === "WHITEBOARD_TEMPLATE_NOT_FOUND")
        void client.invalidateQueries({ queryKey: whiteboardKeys.templates });
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return setError("제목을 입력하세요.");
    setError(undefined);
    create.mutate();
  }
  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title="새 화이트보드"
        className="whiteboard-dialog"
      >
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <Field id="whiteboard-title" label="제목" error={error}>
            <Input
              id="whiteboard-title"
              value={title}
              maxLength={WHITEBOARD_TITLE_MAX}
              onChange={(event) => setTitle(event.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? "whiteboard-title-error" : undefined}
            />
          </Field>
          <div className="grid gap-2">
            <p className="text-sm font-medium">템플릿</p>
            {templates.isPending ? (
              <Skeleton className="h-72" />
            ) : templates.data ? (
              <TemplatePicker
                name="whiteboard-template"
                templates={templates.data}
                value={templateId}
                onChange={setTemplateId}
                actions={(template) =>
                  canManageTemplates &&
                  template.source === "TEAM" && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        className="ui-button-sm"
                        onClick={() => setEditing(template)}
                      >
                        수정
                      </Button>
                      <Button
                        variant="ghost"
                        className="ui-button-sm"
                        onClick={() => setDeleting(template)}
                      >
                        지우기
                      </Button>
                    </div>
                  )
                }
              />
            ) : (
              <p className="text-sm text-muted">
                템플릿을 불러오지 못했습니다. 빈 화이트보드로 만듭니다.
              </p>
            )}
            {canManageTemplates && (
              <p className="text-sm text-muted">
                팀 템플릿은 화이트보드 편집 화면의 팀 템플릿으로 저장에서
                만듭니다.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" variant="primary" loading={create.isPending}>
              만들기
            </Button>
          </div>
        </form>
      </Dialog>
      {/* 대화상자 안에 겹쳐 두지 않는다(탭 순환이 바깥 대화상자까지 섞인다). */}
      {editing && (
        <TemplateFormDialog
          open
          mode={{ kind: "edit", template: editing }}
          onClose={() => setEditing(null)}
        />
      )}
      <DeleteTemplateDialog
        template={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={(id) => {
          if (id === templateId) setTemplateId("BLANK");
        }}
      />
    </>
  );
}
