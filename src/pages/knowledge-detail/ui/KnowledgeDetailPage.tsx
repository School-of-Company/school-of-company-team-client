"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { normalizeApiError } from "@/shared/api";
import {
  KindLabel,
  kindLabels,
  knowledgeErrorMessage,
  knowledgeQueries,
  KnowledgeStatusLabel,
  supersededBy,
  type KnowledgeDetail,
} from "@/entities/knowledge";
import { AuthGuard } from "@/features/auth";
import {
  DeleteDocument,
  DocumentEditor,
  DocumentLinks,
  DocumentStatusSelect,
  DocumentProjectSelect,
} from "@/features/manage-knowledge";
import { routes } from "@/shared/config";
import { formatDate } from "@/shared/lib";
import { Button, ErrorState, Markdown, StaleNotice } from "@/shared/ui";

export function KnowledgeDetailPage({
  documentId,
}: {
  readonly documentId: string;
}) {
  return (
    <AuthGuard require="work" fallback={<KnowledgeDetailSkeleton />}>
      {() => (
        <Suspense fallback={<KnowledgeDetailSkeleton />}>
          <KnowledgeDetailContent key={documentId} documentId={documentId} />
        </Suspense>
      )}
    </AuthGuard>
  );
}

/** 상세 머리글(경로, 제목, 종류와 상태 줄), 본문과 속성 열을 실제와 같은 클래스로 잡는다. */
export function KnowledgeDetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="문서를 불러오는 중"
      className="knowledge-detail grid gap-5"
    >
      <header aria-hidden="true" className="page-header">
        <div className="min-w-0">
          <p className="board-breadcrumb">
            <span className="ui-skeleton-text">문서 / 종류</span>
          </p>
          <h1 className="task-title font-semibold">
            <span className="ui-skeleton-text">문서 제목을 불러오는 중</span>
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-3">
            <span className="knowledge-kind">
              <span className="ui-skeleton-text">ADR</span>
            </span>
            <span className="knowledge-status">
              <span className="ui-skeleton-text">게시</span>
            </span>
          </p>
        </div>
      </header>
      <div aria-hidden="true" className="task-detail">
        <div className="task-detail-grid">
          <div className="task-main">
            <div className="ui-skeleton-list" />
          </div>
          <div className="task-props">
            <dl>
              {[
                "프로젝트",
                "상태",
                "종류",
                "작성자",
                "처음 게시",
                "수정한 날",
              ].map((label) => (
                <div key={label}>
                  <dt>
                    <span className="ui-skeleton-text">{label}</span>
                  </dt>
                  <dd>
                    <span className="ui-skeleton-text">불러오는 중</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function KnowledgeDetailContent({
  documentId,
}: {
  readonly documentId: string;
}) {
  const detail = useQuery(knowledgeQueries.detail(documentId));
  if (detail.error && normalizeApiError(detail.error).status === 404)
    return (
      <ErrorState
        title="문서를 찾을 수 없습니다"
        description="삭제되었거나 주소가 잘못되었습니다. 문서 목록에서 다시 고르세요."
      />
    );
  if (!detail.data && detail.isError)
    return (
      <ErrorState
        description={knowledgeErrorMessage(detail.error)}
        onRetry={() => void detail.refetch()}
      />
    );
  if (!detail.data) return <KnowledgeDetailSkeleton />;
  return (
    <>
      <StaleNotice query={detail} />
      <DocumentWorkspace document={detail.data} />
    </>
  );
}

function DocumentWorkspace({
  document,
}: {
  readonly document: KnowledgeDetail;
}) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const isEditing =
    document.canEdit && (editing || search?.get("edit") === "true");
  const finishEditing = () => {
    setEditing(false);
    router.replace(routes.doc(document.id), { scroll: false });
  };
  const replacements = supersededBy(document.links);
  return (
    <div className="knowledge-detail grid gap-5">
      <header className="page-header">
        <div className="min-w-0">
          <p className="board-breadcrumb">
            <Link href={routes.docs}>문서</Link>
            <span aria-hidden="true">/</span>
            <Link href={`${routes.docs}?type=${document.kind}`}>
              {kindLabels[document.kind]}
            </Link>
          </p>
          <h1 className="task-title font-semibold">{document.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-3">
            <KindLabel kind={document.kind} />
            <KnowledgeStatusLabel status={document.status} />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {document.canEdit && !isEditing && (
            <Button
              variant="secondary"
              className="ui-button-sm"
              onClick={() => setEditing(true)}
            >
              수정
            </Button>
          )}
          {document.canDelete && <DeleteDocument documentId={document.id} />}
        </div>
      </header>
      {replacements.length > 0 && (
        <p role="note" className="service-notice text-sm">
          이 문서를 대체한 문서:{" "}
          {replacements.map((link, index) => (
            <span key={link.linkId}>
              {index > 0 && ", "}
              <Link href={routes.doc(link.document.id)} className="underline">
                {link.document.title}
              </Link>
            </span>
          ))}
        </p>
      )}
      <div className="task-detail">
        <div className="task-detail-grid">
          <div className="task-main">
            {isEditing ? (
              <DocumentEditor document={document} onDone={finishEditing} />
            ) : document.body.trim() ? (
              <article aria-label="본문">
                <Markdown>{document.body}</Markdown>
              </article>
            ) : (
              <p className="text-sm text-muted">본문이 비어 있습니다.</p>
            )}
          </div>
          <aside className="task-props" aria-label="문서 속성">
            <dl>
              <div>
                <dt>프로젝트</dt>
                <dd>
                  {document.canEdit ? (
                    <DocumentProjectSelect document={document} />
                  ) : document.project ? (
                    <Link href={routes.projectDocs(document.project.id)}>
                      {document.project.name}
                    </Link>
                  ) : (
                    "조직"
                  )}
                </dd>
              </div>
              <div>
                <dt>상태</dt>
                <dd>
                  {document.canEdit ? (
                    <DocumentStatusSelect document={document} />
                  ) : (
                    <KnowledgeStatusLabel status={document.status} />
                  )}
                </dd>
              </div>
              <div>
                <dt>종류</dt>
                <dd>
                  <KindLabel kind={document.kind} />
                </dd>
              </div>
              <div>
                <dt>작성자</dt>
                <dd>{document.author?.name ?? "알 수 없음"}</dd>
              </div>
              <div>
                <dt>처음 게시</dt>
                <dd>
                  {document.publishedAt ? (
                    formatDate(document.publishedAt)
                  ) : (
                    <span className="text-muted">아직 없음</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>수정한 날</dt>
                <dd>{formatDate(document.updatedAt)}</dd>
              </div>
            </dl>
            {!document.canEdit && (
              <p className="text-xs text-muted">
                작성자, 연결된 서비스 소유자, 헤드 어드민이 수정할 수 있습니다.
              </p>
            )}
            <DocumentLinks document={document} />
          </aside>
        </div>
      </div>
    </div>
  );
}
