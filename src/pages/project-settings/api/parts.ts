import { useMutation } from "@tanstack/react-query";
import { api } from "@/shared/api";

type PartChange =
  | { readonly action: "create"; readonly name: string }
  | {
      readonly action: "rename";
      readonly partId: string;
      readonly name: string;
    }
  | { readonly action: "delete"; readonly partId: string }
  | {
      readonly action: "add" | "remove";
      readonly partId: string;
      readonly userId: string;
    };

export function useProjectParts(
  projectId: string,
  onSaved: () => Promise<unknown>,
) {
  return useMutation({
    mutationFn: async (change: PartChange) => {
      const base = `/api/v1/projects/${projectId}/parts`;
      switch (change.action) {
        case "create":
          await api.post(base, { name: change.name });
          return;
        case "rename":
          await api.patch(`${base}/${change.partId}`, { name: change.name });
          return;
        case "delete":
          await api.delete(`${base}/${change.partId}`);
          return;
        case "add":
          await api.post(`${base}/${change.partId}/members`, {
            userId: change.userId,
          });
          return;
        case "remove":
          await api.delete(`${base}/${change.partId}/members/${change.userId}`);
          return;
        default: {
          const unreachable: never = change;
          return unreachable;
        }
      }
    },
    onSuccess: onSaved,
  });
}
