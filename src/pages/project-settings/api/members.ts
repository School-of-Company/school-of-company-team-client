import { useMutation } from "@tanstack/react-query";
import { api } from "@/shared/api";

export function useProjectMembers(
  projectId: string,
  onSaved: () => Promise<unknown>,
) {
  return useMutation({
    mutationFn: async (request: {
      readonly userId: string;
      readonly action: "add" | "remove";
    }) => {
      const path = `/api/v1/projects/${projectId}/members`;
      if (request.action === "add") {
        await api.post(path, { userId: request.userId });
      } else {
        await api.delete(`${path}/${request.userId}`);
      }
    },
    onSuccess: onSaved,
  });
}
