import Link from "next/link";
import { boardTotal, type Board, type TaskScope } from "@/entities/task";
import { ProjectAvatar, type ProjectDetail } from "@/entities/project";
import { routes } from "@/shared/config";
import { Button, Icon, SegmentedLinks } from "@/shared/ui";

export function BoardHeader({
  scope,
  project,
  board,
  canCreate,
  editable,
  signedIn,
  onCreate,
}: {
  readonly scope: TaskScope;
  readonly project?: ProjectDetail;
  readonly board?: Board;
  readonly canCreate: boolean;
  readonly editable: boolean;
  readonly signedIn: boolean;
  readonly onCreate: () => void;
}) {
  return (
    <>
      <header className="page-header">
        <div className="min-w-0">
          {project && (
            <p className="board-breadcrumb">
              <Link href="/projects">프로젝트</Link>
              <span aria-hidden="true">/</span>
              <span>{project.key}</span>
            </p>
          )}
          <div className="flex items-center gap-3">
            {project && <ProjectAvatar project={project} />}
            <h1 className="min-w-0 break-words">
              {project?.name ??
                (scope === "PERSONAL" ? "내 업무" : "팀 공용 보드")}
            </h1>
          </div>
          {board && (
            <p className="page-subtitle tabular-nums">
              업무 {boardTotal(board)}개
            </p>
          )}
        </div>
        {/* 내 업무 목록(/)과 같은 자리, 같은 폭의 버튼이라 보기 전환이 움직이지 않는다. Issue 가져오기는 업무 등록 창 안에 있다. */}
        <div className="page-actions">
          {scope === "PERSONAL" && (
            <SegmentedLinks
              label="보기"
              items={[
                { href: routes.home, label: "목록", active: false },
                { href: routes.me, label: "보드", active: true },
              ]}
            />
          )}
          {canCreate && (
            <Button onClick={onCreate}>
              <Icon name="plus" />
              업무 등록
            </Button>
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
          참여자만 업무를 등록하거나 수정할 수 있습니다.
        </p>
      )}
    </>
  );
}
