import Link from "next/link";
import { boardTotal, type Board, type TaskScope } from "@/entities/task";
import { ProjectAvatar, type ProjectDetail } from "@/entities/project";
import { routes } from "@/shared/config";
import { Button, Icon, SegmentedLinks } from "@/shared/ui";

export function BoardHeader({
  scope,
  project,
  board,
  failed,
  canCreate,
  onCreate,
}: {
  readonly scope: TaskScope;
  readonly project?: ProjectDetail;
  /** 확정된 보드(placeholder 아님). 없으면 집계 중. */
  readonly board?: Board;
  readonly failed?: boolean;
  readonly canCreate: boolean;
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
            <h1 className="min-w-0 wrap-anywhere">
              {project?.name ??
                (scope === "PERSONAL" ? "내 업무" : "팀 공용 보드")}
            </h1>
          </div>
          {/* 프로젝트 보드는 다른 프로젝트 탭과 머리 높이를 맞추려고 부제를 두지 않는다(개수는 컬럼마다 있다).
              내 업무, 팀 보드는 집계 중에도 부제 줄을 잡아 두고, 필터를 바꾼 직후 이전 필터의 개수를 보이지 않는다. */}
          {!project && (
            <p className="page-subtitle tabular-nums">
              {board
                ? `업무 ${boardTotal(board)}개`
                : failed
                  ? "업무 수를 불러오지 못했어요"
                  : "업무 집계 중"}
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
          아카이브된 프로젝트예요. 조회만 가능해요.
        </p>
      )}
    </>
  );
}
