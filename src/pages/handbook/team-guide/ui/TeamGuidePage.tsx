"use client";

import { Suspense, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGuard } from "@/features/auth";
import { normalizeApiError } from "@/shared/api";
import { formatDate } from "@/shared/lib";
import {
  Button,
  Dialog,
  ErrorState,
  Markdown,
  Skeleton,
  Spinner,
  Textarea,
} from "@/shared/ui";
import {
  teamGuideApi,
  teamGuideKeys,
  teamGuideQueries,
  type TeamGuide,
} from "../api/team-guide";

/** 팀 문화: 팀이 일하는 방식. 누구나 읽고 헤드 어드민이 고친다. 고칠 때마다 버전이 남는다. */
export function TeamGuidePage() {
  return (
    <AuthGuard require="work">
      {() => (
        <Suspense fallback={<Spinner label="팀 문화 불러오는 중" />}>
          <TeamGuideContent />
        </Suspense>
      )}
    </AuthGuard>
  );
}

function TeamGuideContent() {
  const guide = useQuery(teamGuideQueries.current());
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState(false);
  if (guide.isPending)
    return (
      <div
        role="status"
        aria-label="팀 문화를 불러오는 중"
        className="grid gap-3"
      >
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-96" />
      </div>
    );
  if (!guide.data)
    return (
      <ErrorState
        description={normalizeApiError(guide.error).message}
        onRetry={() => void guide.refetch()}
      />
    );
  const data = guide.data;
  return (
    <div className="guide-page">
      <header className="page-header">
        <div className="min-w-0">
          <h1>팀 문화</h1>
          <p className="page-subtitle">
            {data.updatedBy
              ? `${formatDate(data.updatedAt)} ${data.updatedBy.name} 수정`
              : "처음 작성된 내용입니다"}
            {" · "}
            <button
              type="button"
              className="guide-history-link"
              onClick={() => setHistory(true)}
            >
              수정 이력
            </button>
          </p>
        </div>
        {data.canEdit && !editing && (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            고치기
          </Button>
        )}
      </header>
      {editing ? (
        <GuideEditor guide={data} onDone={() => setEditing(false)} />
      ) : (
        <article className="guide-body">
          <Markdown>{data.content}</Markdown>
        </article>
      )}
      <HistoryDialog open={history} onClose={() => setHistory(false)} />
    </div>
  );
}

function GuideEditor({
  guide,
  onDone,
}: {
  readonly guide: TeamGuide;
  readonly onDone: () => void;
}) {
  const client = useQueryClient();
  const [draft, setDraft] = useState(guide.content);
  const [preview, setPreview] = useState(false);
  const save = useMutation({
    mutationFn: () =>
      teamGuideApi.save({ content: draft, baseVersion: guide.version }),
    onSuccess: async (saved) => {
      client.setQueryData(teamGuideKeys.current, saved);
      await client.invalidateQueries({ queryKey: teamGuideKeys.revisions });
      onDone();
    },
  });
  const conflict =
    save.isError &&
    normalizeApiError(save.error).code === "TEAM_GUIDE_CONFLICT";
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="ui-segmented" role="group" aria-label="편집 보기">
          <button
            type="button"
            className="ui-segmented-option"
            aria-pressed={!preview}
            onClick={() => setPreview(false)}
          >
            작성
          </button>
          <button
            type="button"
            className="ui-segmented-option"
            aria-pressed={preview}
            onClick={() => setPreview(true)}
          >
            미리보기
          </button>
        </div>
        <p className="text-xs text-muted">마크다운을 쓸 수 있습니다.</p>
      </div>
      {preview ? (
        <article className="guide-body guide-preview">
          <Markdown>{draft}</Markdown>
        </article>
      ) : (
        <Textarea
          aria-label="팀 문화 내용"
          value={draft}
          maxLength={50000}
          className="guide-textarea"
          onChange={(event) => setDraft(event.target.value)}
        />
      )}
      {save.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-danger">
            {conflict
              ? "그사이 다른 사람이 먼저 고쳤습니다. 쓴 내용을 복사해 두고 최신 내용을 불러온 뒤 다시 고쳐 주세요."
              : normalizeApiError(save.error).message}
          </span>
          {conflict && (
            <Button
              variant="secondary"
              className="ui-button-sm"
              onClick={async () => {
                await client.invalidateQueries({ queryKey: teamGuideKeys.all });
                onDone();
              }}
            >
              최신 내용 불러오기
            </Button>
          )}
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" disabled={save.isPending} onClick={onDone}>
          취소
        </Button>
        <Button
          loading={save.isPending}
          disabled={draft === guide.content}
          onClick={() => save.mutate()}
        >
          저장
        </Button>
      </div>
    </div>
  );
}

function HistoryDialog({
  open,
  onClose,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  const [version, setVersion] = useState<number | null>(null);
  return (
    <Dialog
      open={open}
      onClose={() => {
        setVersion(null);
        onClose();
      }}
      title={version ? `버전 ${version}` : "수정 이력"}
      className="incident-dialog"
    >
      {open &&
        (version ? (
          <RevisionView version={version} onBack={() => setVersion(null)} />
        ) : (
          <RevisionList onOpen={setVersion} />
        ))}
    </Dialog>
  );
}

function RevisionList({
  onOpen,
}: {
  readonly onOpen: (version: number) => void;
}) {
  const revisions = useQuery(teamGuideQueries.revisions());
  if (revisions.isPending) return <Spinner label="이력 불러오는 중" />;
  if (!revisions.data)
    return (
      <ErrorState
        description={normalizeApiError(revisions.error).message}
        onRetry={() => void revisions.refetch()}
      />
    );
  return (
    <ul className="list">
      {revisions.data.map((revision) => (
        <li key={revision.version} className="list-row">
          <button
            type="button"
            className="list-row-main text-left"
            onClick={() => onOpen(revision.version)}
          >
            <span className="list-row-key">버전 {revision.version}</span>
            <span className="list-row-title">
              {revision.updatedBy?.name ?? "처음 작성"}
            </span>
          </button>
          <span className="list-row-meta">
            {formatDate(revision.updatedAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function RevisionView({
  version,
  onBack,
}: {
  readonly version: number;
  readonly onBack: () => void;
}) {
  const revision = useQuery(teamGuideQueries.revision(version));
  return (
    <div className="grid gap-4">
      <button
        type="button"
        className="ui-link-button justify-self-start"
        onClick={onBack}
      >
        이력으로 돌아가기
      </button>
      {revision.isPending ? (
        <Spinner label="불러오는 중" />
      ) : revision.data ? (
        <article className="guide-body">
          <Markdown>{revision.data.content}</Markdown>
        </article>
      ) : (
        <ErrorState
          description={normalizeApiError(revision.error).message}
          onRetry={() => void revision.refetch()}
        />
      )}
    </div>
  );
}
