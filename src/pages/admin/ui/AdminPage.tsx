"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { projectKeys } from "@/entities/project";
import { isHeadAdmin, type User } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import { AdminSettings } from "./AdminSettings";
import { AgentAdmin } from "./AgentAdmin";
import {
  ErrorState,
  PageHeader,
  PageSkeleton,
  SegmentedLinks,
} from "@/shared/ui";
import { CreateProjectForm } from "./CreateProjectForm";
import { DocumentTemplates } from "@/features/manage-knowledge";
import { AutomationOverview, TeamRules } from "@/widgets/automation-rules";

export function AdminPage() {
  return (
    <AuthGuard require="work">
      {(user) =>
        isHeadAdmin(user) ? (
          <Suspense fallback={<PageSkeleton label="관리자 설정 불러오는 중" />}>
            <AdminContent user={user} />
          </Suspense>
        ) : (
          <ErrorState
            title="관리자 권한이 필요해요"
            description="헤드 어드민만 조직 사용자와 프로젝트를 관리할 수 있어요."
          />
        )
      }
    </AuthGuard>
  );
}

function AdminContent({ user }: { readonly user: User }) {
  const client = useQueryClient();
  const creating = useSearchParams()?.get("create") === "project";
  const tab = useSearchParams()?.get("tab") ?? "users";
  const refresh = () => client.invalidateQueries({ queryKey: projectKeys.all });
  return (
    <div className="settings-page admin-page mx-auto grid w-full min-w-0 gap-6 break-keep">
      <PageHeader
        title={creating ? "새 프로젝트" : "관리자 설정"}
        subtitle={
          creating
            ? "기본 정보를 만들고 팀원과 저장소를 연결해요"
            : "사용자와 공용 연동"
        }
        actions={
          <Link
            href={creating ? "/admin" : "/admin?create=project"}
            className="ui-button ui-button-secondary"
          >
            {creating ? "관리자 설정으로" : "새 프로젝트"}
          </Link>
        }
      />
      {!creating && (
        <div className="page-toolbar">
          <SegmentedLinks
            label="관리자 설정 구역"
            items={[
              { id: "users", label: "사용자 관리" },
              { id: "integrations", label: "연동" },
              { id: "templates", label: "문서 템플릿" },
              { id: "agent", label: "에이전트" },
              { id: "team-rules", label: "팀 규칙" },
              { id: "automation", label: "자동화 현황" },
            ].map((item) => ({
              href: `/admin?tab=${item.id}`,
              label: item.label,
              active: tab === item.id,
            }))}
          />
        </div>
      )}
      {creating ? (
        <CreateProjectForm onSaved={refresh} />
      ) : tab === "templates" ? (
        <DocumentTemplates />
      ) : tab === "agent" ? (
        <AgentAdmin />
      ) : tab === "team-rules" ? (
        <TeamRules />
      ) : tab === "automation" ? (
        <AutomationOverview />
      ) : (
        <AdminSettings
          user={user}
          section={tab === "integrations" ? "integrations" : "users"}
        />
      )}
    </div>
  );
}
