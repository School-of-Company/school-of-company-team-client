import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api";

export type AdminUser = {
  readonly id: string;
  readonly username: string;
  readonly name: string;
  readonly role: "LEAD" | "MEMBER";
  readonly status: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
  readonly approvedAt: string | null;
  readonly createdAt: string;
};

type UserChange =
  | {
      readonly action: "approve" | "reject" | "suspend" | "reactivate";
      readonly userId: string;
    }
  | {
      readonly action: "role";
      readonly userId: string;
      readonly role: "LEAD" | "MEMBER";
    };

export function useAdminUsers(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () =>
      (await api.get<readonly AdminUser[]>("/api/v1/admin/users")).data,
    enabled,
  });
}

export function useAdminUserChange() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (change: UserChange) => {
      const base = `/api/v1/admin/users/${change.userId}`;
      if (change.action === "role") {
        await api.patch(`${base}/role`, { role: change.role });
      } else {
        await api.post(`${base}/${change.action}`);
      }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}
