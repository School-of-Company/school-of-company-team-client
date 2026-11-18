import Link from "next/link";
import { boardTotal, type Board, type TaskScope } from "@/entities/task";
import type { ProjectDetail } from "@/entities/project";
import { ImportIssue } from "@/features/link-github-issue";
import { Button, Icon } from "@/shared/ui";

export function BoardHeader({
  scope,
  project,
  board,
  canCreate,
  editable,
  signedIn,
  onCreate,
  onImport,
}: {
  readonly scope: TaskScope;
  readonly project?: ProjectDetail;
  readonly board?: Board;
  readonly canCreate: boolean;
  readonly editable: boolean;
  readonly signedIn: boolean;
  readonly onCreate: () => void;
  readonly onImport: (id: string) => void;
}) {
  return (
    <>
      <header className="board-header flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          {project && (
            <p className="board-breadcrumb">
              <Link href="/projects">프로젝트</Link>
              <span aria-hidden="true">/</span>
              <span>{project.key}</span>
            </p>
          )}
          <h1 className="text-xl font-semibold break-words">
            {project?.name ??
              (scope === "PERSONAL" ? "내 보드" : "팀 공용 보드")}
          </h1>
          {board && (
            <p className="mt-1 text-xs text-muted tabular-nums">
              업무 {boardTotal(board)}개
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate && (
            <>
              {scope !== "TEAM" && (
                <ImportIssue projectId={project?.id} onImported={onImport} />
              )}
              <Button onClick={onCreate}>
                <Icon name="plus" className="inline-block" />{" "}
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
