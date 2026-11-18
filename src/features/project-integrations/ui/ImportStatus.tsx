import { importSummary, type RepositoryImport } from "../model/import-status";

// 진행은 문구·숫자로만 표시한다(스피너 없음).
export function ImportStatus({
  run,
  onRetry,
  retrying,
}: {
  readonly run: RepositoryImport;
  readonly onRetry?: () => void;
  readonly retrying: boolean;
}) {
  const summary = importSummary(run);
  return (
    <p
      role="status"
      className={`mt-2 flex flex-wrap items-center gap-2 text-sm ${summary.tone === "danger" ? "text-danger" : "text-muted"}`}
    >
      <span>{summary.text}</span>
      {summary.retryable && onRetry && (
        <button
          type="button"
          className="ui-link-button"
          disabled={retrying}
          aria-busy={retrying}
          onClick={onRetry}
        >
          다시 시도
        </button>
      )}
    </p>
  );
}
