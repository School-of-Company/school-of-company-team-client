import {
  useRepositoryImport,
  useStartRepositoryImport,
  type ProjectRepository,
} from "../api/integrations";
import { githubErrorMessage } from "../model/github-error";
import { importSummary } from "../model/import-status";

// 진행은 문구·숫자로만 표시한다(스피너 없음). 관리자 아닌 조회자는 서버가 import를 주지 않는다.
export function ImportStatus({
  projectId,
  projectKey,
  repository,
  disabled,
}: {
  readonly projectId: string;
  readonly projectKey: string;
  readonly repository: ProjectRepository;
  readonly disabled: boolean;
}) {
  const run = useRepositoryImport(projectId, projectKey, repository, !disabled);
  const start = useStartRepositoryImport(projectId, projectKey, repository.id);
  if (disabled || (run.data === undefined && !run.isError)) return null;
  const action = (label: string) => (
    <button
      type="button"
      className="ui-link-button"
      disabled={start.isPending}
      aria-busy={start.isPending}
      onClick={() => start.mutate()}
    >
      {label}
    </button>
  );
  const summary = run.data && importSummary(run.data);
  return (
    <div className="mt-2 grid gap-1 text-sm">
      {summary && (
        <p
          role="status"
          className={`flex flex-wrap items-center gap-2 ${summary.tone === "danger" ? "text-danger" : "text-muted"}`}
        >
          <span>{summary.text}</span>
          {summary.retryable && action("다시 시도")}
        </p>
      )}
      {run.data === null && (
        <p className="flex flex-wrap items-center gap-2 text-muted">
          <span>아직 Issue를 가져오지 않았어요.</span>
          {action("열린 Issue 가져오기")}
        </p>
      )}
      {(start.isError || run.isError) && (
        <p role="alert" className="text-danger">
          {githubErrorMessage(start.error ?? run.error)}
        </p>
      )}
    </div>
  );
}
