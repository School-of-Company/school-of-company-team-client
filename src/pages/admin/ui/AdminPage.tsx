"use client";

import { useQueryClient } from "@tanstack/react-query";
import { projectKeys } from "@/entities/project";
import { useMe } from "@/entities/user";
import { AdminSettings } from "./AdminSettings";
import { normalizeApiError } from "@/shared/api";
import { ErrorState, Spinner } from "@/shared/ui";

export function AdminPage() {
  const me = useMe();
  const client = useQueryClient();
  if (me.isError)
    return (
      <ErrorState
        description={normalizeApiError(me.error).message}
        onRetry={() => void me.refetch()}
      />
    );
  if (me.isPending) return <Spinner label="권한 확인 중" />;
  return (
    <div className="mx-auto grid w-full max-w-3xl min-w-0 gap-8 p-4 sm:p-8">
      <h1 className="text-3xl font-semibold">관리자 설정</h1>
      <AdminSettings
        user={me.data}
        onProjectCreated={() =>
          client.invalidateQueries({ queryKey: projectKeys.all })
        }
      />
    </div>
  );
}
