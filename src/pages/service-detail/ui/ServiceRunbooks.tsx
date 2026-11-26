"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ServiceDetail } from "@/entities/service";
import { knowledgeErrorMessage, knowledgeQueries } from "@/entities/knowledge";
import { CreateDocumentDialog } from "@/features/manage-knowledge";
import { routes } from "@/shared/config";
import { formatDate } from "@/shared/lib";
import { Button, EmptyState, ErrorState, ListSkeleton } from "@/shared/ui";

/** 게시된 Runbook만(D7-12). 초안은 문서 화면에서 다듬은 뒤 게시하면 여기에 나온다. 사고 상세에도 같은 Runbook이 뜬다. */
export function ServiceRunbooks({
  service,
}: {
  readonly service: ServiceDetail;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const runbooks = useQuery(
    knowledgeQueries.list({
      kind: "RUNBOOK",
      status: "PUBLISHED",
      serviceId: service.id,
    }),
  );
  const create = !service.archived && (
    <Button
      variant="secondary"
      className="ui-button-sm"
      onClick={() => setCreating(true)}
    >
      Runbook 만들기
    </Button>
  );
  return (
    <section aria-labelledby="service-runbooks" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="service-runbooks" className="text-md font-semibold">
          게시된 Runbook{" "}
          {runbooks.data && (
            <span className="text-sm font-normal text-muted tabular-nums">
              {runbooks.data.length}
            </span>
          )}
        </h2>
        {runbooks.data && runbooks.data.length > 0 && create}
      </div>
      {runbooks.isPending ? (
        <ListSkeleton
          label="Runbook을 불러오는 중"
          rows={2}
          rowClassName="h-10"
        />
      ) : !runbooks.data ? (
        <ErrorState
          description={knowledgeErrorMessage(runbooks.error)}
          onRetry={() => void runbooks.refetch()}
        />
      ) : runbooks.data.length === 0 ? (
        <EmptyState
          title="게시된 Runbook이 없어요"
          description="장애 때 따라 할 절차를 Runbook으로 남기면 이 서비스의 장애 화면에도 나와요."
          action={create || undefined}
        />
      ) : (
        <ul className="service-list">
          {runbooks.data.map((runbook) => (
            <li key={runbook.id}>
              <div className="service-list-row">
                <Link href={routes.doc(runbook.id)} className="min-w-0">
                  <span className="block truncate font-medium">
                    {runbook.title}
                  </span>
                </Link>
                <span className="text-xs text-muted tabular-nums">
                  {runbook.author?.name ?? "알 수 없음"},{" "}
                  {formatDate(runbook.updatedAt)} 수정
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <CreateDocumentDialog
        open={creating}
        kind="RUNBOOK"
        serviceIds={[service.id]}
        context={`${service.name} 서비스에 연결해요. 게시하면 이 탭에 나와요.`}
        onClose={() => setCreating(false)}
        onCreated={(document) => {
          setCreating(false);
          router.push(routes.doc(document.id));
        }}
      />
    </section>
  );
}
