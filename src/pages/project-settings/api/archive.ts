import { useMutation } from "@tanstack/react-query";
import { api } from "@/shared/api";

export function useProjectArchive(
  projectId: string,
  onSaved: () => Promise<unknown>,
) {
  return useMutation({
    mutationFn: async (action: "archive" | "restore") => {
      await api.post(`/api/v1/projects/${projectId}/${action}`);
    },
    onSuccess: onSaved,
  });
}
