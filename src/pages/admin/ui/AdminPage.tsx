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
  const refresh = () => client.invalidateQueries({ queryKey: projectKeys.all });
  return (
    <div className="settings-page mx-auto grid w-full max-w-3xl min-w-0 gap-6">
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
      {creating ? (
        <CreateProjectForm onSaved={refresh} />
      ) : (
        <AdminSettings user={user} />
      )}
    </div>
  );
}
