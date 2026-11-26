"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  formatDateTime,
  formatDuration,
  impactMinutes,
  IncidentStatusLabel,
  SeverityLabel,
  severityDescriptions,
  type IncidentDetail,
} from "@/entities/incident";
import {
  KindLabel,
  KnowledgeStatusLabel,
  type KnowledgeSummary,
} from "@/entities/knowledge";
import { TierLabel } from "@/entities/service";
import { avatarSrc } from "@/entities/user";
import { IncidentDiscord } from "@/features/manage-incident";
import { CreateDocumentDialog } from "@/features/manage-knowledge";
import { routes } from "@/shared/config";
import { Avatar, Button } from "@/shared/ui";

export function IncidentProperties({
  incident,
  headAdmin,
}: {
  readonly incident: IncidentDetail;
  readonly headAdmin: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const minutes = impactMinutes(incident);
  return (
    <aside className="task-props" aria-label="장애 속성">
      <dl>
        <div>
          <dt>상태</dt>
          <dd>
            <IncidentStatusLabel status={incident.status} />
          </dd>
        </div>
        <div>
          <dt>심각도</dt>
          <dd>
            <SeverityLabel severity={incident.severity} />
            <span className="text-xs text-muted">
              {severityDescriptions[incident.severity]}
            </span>
          </dd>
        </div>
        <div>
          <dt>대응 책임자</dt>
          <dd>
            {incident.commander ? (
              <span className="service-owner">
                <Avatar
                  name={incident.commander.name}
                  src={avatarSrc(incident.commander.avatarUrl)}
                />
                <span className="truncate">{incident.commander.name}</span>
              </span>
            ) : (
              <span className="text-muted">없음</span>
            )}
          </dd>
        </div>
        <div>
          <dt>시작</dt>
          <dd className="tabular-nums">{formatDateTime(incident.startedAt)}</dd>
        </div>
        <div>
          <dt>완화</dt>
          <dd className="tabular-nums">
            {incident.mitigatedAt ? (
              formatDateTime(incident.mitigatedAt)
            ) : (
              <span className="text-muted">기록 없음</span>
            )}
          </dd>
        </div>
        <div>
          <dt>해결</dt>
          <dd className="tabular-nums">
            {incident.resolvedAt ? (
              formatDateTime(incident.resolvedAt)
            ) : (
              <span className="text-muted">미해결</span>
            )}
          </dd>
        </div>
        <div>
          <dt>영향 시간</dt>
          <dd className="tabular-nums">
            {formatDuration(minutes)}
            {!incident.resolvedAt && (
              <span className="text-xs text-muted">진행 중</span>
            )}
          </dd>
        </div>
        <div className="incident-prop-list">
          <dt>영향 서비스</dt>
          <dd>
            {incident.services.length === 0 ? (
              <span className="text-muted">없음</span>
            ) : (
              <ul className="grid grid-cols-1 gap-1">
                {incident.services.map((service) => (
                  <li key={service.id} className="flex items-center gap-2">
                    <Link
                      href={routes.service(service.key)}
                      className="min-w-0 truncate hover:underline"
                    >
                      {service.name}
                    </Link>
                    <TierLabel tier={service.tier} />
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div>
          <dt>등록</dt>
          <dd>{incident.createdBy?.name ?? "알 수 없음"}</dd>
        </div>
      </dl>
      {!incident.canEdit && (
        <p className="text-xs text-muted">
          장애 작성자, 대응 책임자, 영향 서비스 소유자, 헤드 어드민이 바꿀 수
          있습니다. 메모는 누구나 남길 수 있습니다.
        </p>
      )}
      <PropSection title="Discord">
        <IncidentDiscord
          incidentId={incident.id}
          threadUrl={incident.discordThreadUrl}
          headAdmin={headAdmin}
        />
      </PropSection>
      <PropSection title="Runbook" count={incident.runbooks.length}>
        {incident.runbooks.length === 0 ? (
          <p className="text-sm text-muted">
            {incident.services.length
              ? "영향 서비스에 게시된 Runbook이 없습니다."
              : "영향 서비스를 고르면 그 서비스의 Runbook이 여기에 나옵니다."}
          </p>
        ) : (
          <DocumentList documents={incident.runbooks} />
        )}
      </PropSection>
      <PropSection
        title="관련 문서"
        count={incident.documents.length}
        action={
          <Button
            variant="ghost"
            className="ui-button-sm"
            onClick={() => setCreating(true)}
          >
            문서 만들기
          </Button>
        }
      >
        {incident.documents.length === 0 ? (
          <p className="text-sm text-muted">연결된 문서가 없습니다.</p>
        ) : (
          <DocumentList documents={incident.documents} showStatus />
        )}
      </PropSection>
      <CreateDocumentDialog
        open={creating}
        incidentId={incident.id}
        context="이 장애에 연결합니다."
        onClose={() => setCreating(false)}
        onCreated={(document) => {
          setCreating(false);
          router.push(routes.doc(document.id));
        }}
      />
    </aside>
  );
}

function PropSection({
  title,
  count,
  action,
  children,
}: {
  readonly title: string;
  readonly count?: number;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section className="incident-prop-section" aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">
          {title}
          {count !== undefined && (
            <span className="ml-1 font-normal text-muted tabular-nums">
              {count}
            </span>
          )}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function DocumentList({
  documents,
  showStatus = false,
}: {
  readonly documents: readonly KnowledgeSummary[];
  readonly showStatus?: boolean;
}) {
  return (
    <ul className="doc-links">
      {documents.map((document) => (
        <li key={document.id}>
          <Link href={routes.doc(document.id)} className="doc-link-main">
            <span className="truncate">{document.title}</span>
            <span className="flex items-center gap-2">
              <KindLabel kind={document.kind} />
              {showStatus && <KnowledgeStatusLabel status={document.status} />}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
