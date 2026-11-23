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
  type WhiteboardSummary,
} from "@/entities/whiteboard";
import { AuthGuard } from "@/features/auth";
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
  Skeleton,
  useToast,
} from "@/shared/ui";
import { ProjectHeading } from "@/widgets/project-nav";

/** projectId 가 없으면 팀 공용 화이트보드 목록(`/whiteboards`), 있으면 프로젝트 탭. */
export function WhiteboardListPage({
  projectId,
}: {
  readonly projectId?: string;
}) {
  return (
    <AuthGuard require="work">
      {(user) =>
        projectId ? (
          <ProjectWhiteboards projectId={projectId} user={user} />
        ) : (
          <div className="grid gap-5">
            <Boards
              projectId={null}
              canCreate
              heading={
                <div className="min-w-0">
                  <h1>화이트보드</h1>
                  <p className="page-subtitle">
                    팀 공용 보드입니다. 활성 팀원 누구나 그리고 고칠 수
                    있습니다.
                  </p>
                </div>
              }
            />
          </div>
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
  if (project.isPending)
    return (
      <div
        role="status"
        aria-label="프로젝트 불러오는 중"
        className="grid gap-3"
      >
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-9 w-64 max-w-full" />
      </div>
    );
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
        heading={
          <h2 id="whiteboards-heading" className="text-lg font-semibold">
            화이트보드
          </h2>
        }
      />
    </div>
  );
}

function Boards({
  projectId,
  canCreate,
  heading,
}: {
  readonly projectId: string | null;
  readonly canCreate: boolean;
  readonly heading: React.ReactNode;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const boards = useQuery(whiteboardQueries.list(projectId));
  return (
    <section className="grid gap-5">
      <div className={projectId ? "planning-section-head" : "page-header"}>
        {heading}
        {canCreate && (
          <Button onClick={() => setCreating(true)}>
            <Icon name="plus" className="inline-block" /> 새 화이트보드
          </Button>
        )}
      </div>
      {boards.isPending ? (
        <div
          role="status"
          aria-label="화이트보드 불러오는 중"
          className="grid gap-2"
        >
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : !boards.data ? (
        <ErrorState
          description={whiteboardErrorMessage(boards.error)}
          onRetry={() => void boards.refetch()}
        />
      ) : boards.data.length === 0 ? (
        <EmptyState
          title="화이트보드가 없습니다"
          description="회의 메모, 회고, 흐름도를 템플릿으로 바로 시작할 수 있습니다."
        />
      ) : (
        <ul className="list" aria-label="화이트보드 목록">
          {boards.data.map((board) => (
            <BoardRow key={board.id} board={board} />
          ))}
        </ul>
      )}
      <CreateDialog
        open={creating}
        projectId={projectId}
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
  onClose,
  onCreated,
}: {
  readonly open: boolean;
  readonly projectId: string | null;
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
    onError: (failure) => toast(whiteboardErrorMessage(failure), "error"),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return setError("제목을 입력하세요.");
    setError(undefined);
    create.mutate();
  }
  return (
    <Dialog open={open} onClose={onClose} title="새 화이트보드">
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
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">템플릿</legend>
          {templates.isPending ? (
            <Skeleton className="h-24" />
          ) : (
            (
              templates.data ?? [
                { id: "BLANK", name: "빈 보드", description: "" },
              ]
            ).map((template) => (
              <label key={template.id} className="whiteboard-template">
                <input
                  type="radio"
                  name="whiteboard-template"
                  value={template.id}
                  checked={templateId === template.id}
                  onChange={() => setTemplateId(template.id)}
                />
                <span className="grid">
                  <span className="font-medium">{template.name}</span>
                  {template.description && (
                    <span className="text-sm text-muted">
                      {template.description}
                    </span>
                  )}
                </span>
              </label>
            ))
          )}
        </fieldset>
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
  );
}
