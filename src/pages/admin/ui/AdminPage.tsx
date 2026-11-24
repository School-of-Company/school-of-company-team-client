"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { projectKeys } from "@/entities/project";
import { isHeadAdmin, type User } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import { AdminSettings } from "./AdminSettings";
import { ErrorState, Spinner } from "@/shared/ui";
import { CreateProjectForm } from "./CreateProjectForm";
import { DocumentTemplates } from "@/features/manage-knowledge";

export function AdminPage() {
  return (
    <AuthGuard require="work">
      {(user) =>
        isHeadAdmin(user) ? (
          <Suspense fallback={<Spinner label="관리자 설정 불러오는 중" />}>
            <AdminContent user={user} />
          </Suspense>
        ) : (
          <ErrorState
            title="관리자 권한이 필요합니다"
            description="헤드 어드민만 조직 사용자와 프로젝트를 관리할 수 있습니다."
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
      <header className="page-header">
        <div className="grid gap-2">
          <h1>{creating ? "새 프로젝트" : "관리자 설정"}</h1>
          <p className="text-sm text-muted">
            {creating
              ? "기본 정보를 만든 뒤 팀원과 저장소를 연결합니다."
              : "조직 사용자와 공용 연동을 관리합니다."}
          </p>
        </div>
        <Link
          href={creating ? "/admin" : "/admin?create=project"}
          className="ui-button ui-button-secondary"
        >
          {creating ? "관리자 설정으로" : "새 프로젝트"}
        </Link>
      </header>
      {!creating && (
        <nav className="settings-nav" aria-label="관리자 설정 구역">
          {[
            { id: "users", label: "사용자 관리" },
            { id: "integrations", label: "연동" },
            { id: "templates", label: "문서 템플릿" },
          ].map((item) => (
            <Link
              key={item.id}
              href={`/admin?tab=${item.id}`}
              aria-current={tab === item.id ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
      {creating ? (
        <CreateProjectForm onSaved={refresh} />
      ) : tab === "templates" ? (
        <DocumentTemplates />
      ) : (
        <AdminSettings
          user={user}
          section={tab === "integrations" ? "integrations" : "users"}
        />
      )}
    </div>
  );
}
