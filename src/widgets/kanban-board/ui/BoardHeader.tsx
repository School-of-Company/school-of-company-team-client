import Link from "next/link";
import { boardTotal, type Board, type TaskScope } from "@/entities/task";
import type { ProjectDetail } from "@/entities/project";
import { ImportIssue } from "@/features/link-github-issue";
import { Button } from "@/shared/ui";

export function BoardHeader({
  scope,
  project,
  board,
  canCreate,
  manages,
  editable,
  signedIn,
  onCreate,
  onImport,
}: {
  readonly scope: TaskScope;
  readonly project?: ProjectDetail;
  readonly board?: Board;
  readonly canCreate: boolean;
  readonly manages: boolean;
  readonly editable: boolean;
  readonly signedIn: boolean;
  readonly onCreate: () => void;
  readonly onImport: (id: string) => void;
}) {
  const projectId = project?.id;
  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold break-words">
            {project?.name ??
              (scope === "PERSONAL" ? "내 보드" : "팀 공용 보드")}
          </h1>
          {board && (
            <p className="mt-2 text-sm text-muted">
              고유 업무 {boardTotal(board)}개 / 완료 전체{" "}
              {board.counts.DONE ?? 0}개
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {projectId && manages && (
            <Link
              href={`/projects/${encodeURIComponent(projectId)}/settings`}
              className="ui-button ui-button-secondary"
            >
              프로젝트 설정
            </Link>
          )}
          {canCreate && (
            <>
              {scope !== "TEAM" && (
                <ImportIssue projectId={project?.id} onImported={onImport} />
              )}
              <Button onClick={onCreate}>
                {scope === "PERSONAL" ? "개인 업무 등록" : "업무 등록"}
              </Button>
            </>
          )}
        </div>
      </header>
      {project?.archived && (
        <p role="status" className="text-sm text-muted">
          아카이브된 프로젝트입니다. 조회만 가능합니다.
        </p>
      )}
      {scope === "PROJECT" && signedIn && !editable && !project?.archived && (
        <p className="text-sm text-muted">
          참여자만 업무를 등록·수정할 수 있습니다.
        </p>
      )}
    </>
  );
}
