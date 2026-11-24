"use client";

import { Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  type GuideSection,
  type TeamGuide,
} from "../api/team-guide";
import { guideTabs, readGuideTab, type GuideTab } from "../model/tabs";

/** 팀 문화: 팀이 일하는 방식. 탭(섹션)마다 문서 하나, 누구나 읽고 헤드 어드민이 고친다. 고칠 때마다 섹션별 버전이 남는다. */
export function TeamGuidePage() {
  return (
    <AuthGuard require="work">
      {() => (
        <Suspense fallback={<Spinner label="팀 문화 불러오는 중" />}>
          <TeamGuideTabs />
        </Suspense>
      )}
    </AuthGuard>
  );
}

function TeamGuideTabs() {
  const pathname = usePathname();
  const search = useSearchParams();
  const current = readGuideTab(search?.get("tab"));
  // key 로 탭마다 편집·이력 상태를 새로 시작한다.
  return (
    <TeamGuideContent
      key={current.section}
      current={current}
      nav={
        <nav aria-label="팀 문화 영역" className="settings-nav">
          {guideTabs.map((item) => (
            <Link
              key={item.tab}
              href={`${pathname}?tab=${item.tab}`}
              scroll={false}
              aria-current={item.tab === current.tab ? "page" : undefined}
              className="ui-nav-link"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      }
    />
  );
}

function TeamGuideContent({
  current,
  nav,
}: {
  readonly current: GuideTab;
  readonly nav: ReactNode;
}) {
  const section = current.section;
  const guide = useQuery(teamGuideQueries.current(section));
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState(false);
  if (guide.isPending)
    return (
      <div
        role="status"
        aria-label={`${current.label} 불러오는 중`}
        className="grid gap-3"
      >
        {nav}
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-96" />
      </div>
    );
  if (!guide.data)
    return (
      <div className="grid gap-3">
        {nav}
        <ErrorState
          description={normalizeApiError(guide.error).message}
          onRetry={() => void guide.refetch()}
        />
      </div>
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
            {", "}
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
      {nav}
      {editing ? (
        <GuideEditor
          section={section}
          label={current.label}
          guide={data}
          onDone={() => setEditing(false)}
        />
      ) : (
        <article className="guide-body">
          <Markdown>{data.content}</Markdown>
        </article>
      )}
      <HistoryDialog
        section={section}
        label={current.label}
        open={history}
        onClose={() => setHistory(false)}
      />
    </div>
  );
}

function GuideEditor({
  section,
  label,
  guide,
  onDone,
}: {
  readonly section: GuideSection;
  readonly label: string;
  readonly guide: TeamGuide;
  readonly onDone: () => void;
}) {
  const client = useQueryClient();
  const [draft, setDraft] = useState(guide.content);
  const [preview, setPreview] = useState(false);
  const save = useMutation({
    mutationFn: () =>
      teamGuideApi.save(section, {
        content: draft,
        baseVersion: guide.version,
      }),
    onSuccess: async (saved) => {
      client.setQueryData(teamGuideKeys.current(section), saved);
      await client.invalidateQueries({
        queryKey: teamGuideKeys.revisions(section),
      });
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
          aria-label={`${label} 내용`}
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
                await client.invalidateQueries({
                  queryKey: teamGuideKeys.section(section),
                });
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
  section,
  label,
  open,
  onClose,
}: {
  readonly section: GuideSection;
  readonly label: string;
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
      title={version ? `${label} 버전 ${version}` : `${label} 수정 이력`}
      className="incident-dialog"
    >
      {open &&
        (version ? (
          <RevisionView
            section={section}
            version={version}
            onBack={() => setVersion(null)}
          />
        ) : (
          <RevisionList section={section} onOpen={setVersion} />
        ))}
    </Dialog>
  );
}

function RevisionList({
  section,
  onOpen,
}: {
  readonly section: GuideSection;
  readonly onOpen: (version: number) => void;
}) {
  const revisions = useQuery(teamGuideQueries.revisions(section));
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
  section,
  version,
  onBack,
}: {
  readonly section: GuideSection;
  readonly version: number;
  readonly onBack: () => void;
}) {
  const revision = useQuery(teamGuideQueries.revision(section, version));
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
