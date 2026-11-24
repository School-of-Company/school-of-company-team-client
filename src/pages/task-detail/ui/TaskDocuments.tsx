"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  KindLabel,
  knowledgeErrorMessage,
  knowledgeQueries,
  KnowledgeStatusLabel,
} from "@/entities/knowledge";
import { LinkTaskDocument } from "@/features/manage-knowledge";
import { routes } from "@/shared/config";
import { Button, Skeleton } from "@/shared/ui";

/** 이 업무에 연결된 ADR·RFC·Runbook. 개인 업무는 문서에 연결할 수 없어 이 칸을 그리지 않는다. */
export function TaskDocuments({ taskId }: { readonly taskId: string }) {
  const documents = useQuery(knowledgeQueries.list({ taskId }));
  return (
    <section
      aria-labelledby="task-documents"
      className="grid gap-3 border-t border-border pt-6"
    >
      <div className="task-docs-head flex flex-wrap items-center justify-between gap-2">
        <h2 id="task-documents" className="text-lg font-semibold">
          관련 문서{" "}
          {documents.data && (
            <span className="text-sm font-normal text-muted tabular-nums">
              {documents.data.length}
            </span>
          )}
        </h2>
        {documents.data && (
          <LinkTaskDocument
            taskId={taskId}
            linkedIds={documents.data.map((document) => document.id)}
          />
        )}
      </div>
      <div className="task-docs-slot">
        {documents.isPending ? (
          <div role="status" aria-label="관련 문서를 불러오는 중">
            <Skeleton className="h-10" />
          </div>
        ) : !documents.data ? (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 text-sm"
          >
            <span className="text-danger">
              {knowledgeErrorMessage(documents.error)}
            </span>
            <Button
              variant="ghost"
              className="ui-button-sm"
              onClick={() => void documents.refetch()}
            >
              다시 시도
            </Button>
          </div>
        ) : documents.data.length === 0 ? (
          <p className="text-sm text-muted">연결된 문서가 없습니다.</p>
        ) : (
          <ul className="doc-links">
            {documents.data.map((document) => (
              <li key={document.id}>
                <Link href={routes.doc(document.id)} className="doc-link-main">
                  <span className="truncate">{document.title}</span>
                  <span className="flex items-center gap-2">
                    <KindLabel kind={document.kind} />
                    <KnowledgeStatusLabel status={document.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
