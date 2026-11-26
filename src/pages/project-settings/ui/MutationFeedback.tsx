import { normalizeApiError } from "@/shared/api";
import { settingsErrorMessage } from "@/features/project-settings";

export function MutationFeedback({
  error,
  success,
}: {
  readonly error: unknown;
  readonly success: boolean;
}) {
  if (error)
    return (
      <p role="alert" className="text-xs text-danger">
        {settingsErrorMessage(normalizeApiError(error))}
      </p>
    );
  if (success)
    return (
      <p role="status" className="text-xs text-muted">
        저장했어요
      </p>
    );
  return null;
}
