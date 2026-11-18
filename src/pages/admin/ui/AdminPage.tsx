"use client";

import { useQueryClient } from "@tanstack/react-query";
import { projectKeys } from "@/entities/project";
import { isHeadAdmin, type User } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import { AdminSettings } from "./AdminSettings";
import { ErrorState } from "@/shared/ui";

export function AdminPage() {
  return (
    <AuthGuard require="work">
      {(user) =>
        isHeadAdmin(user) ? (
          <AdminContent user={user} />
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
  return (
    <div className="mx-auto grid w-full max-w-3xl min-w-0 gap-8 p-4 sm:p-8">
      <h1 className="text-3xl font-semibold">관리자 설정</h1>
      <AdminSettings
        user={user}
        onProjectCreated={() =>
          client.invalidateQueries({ queryKey: projectKeys.all })
        }
      />
    </div>
  );
}
