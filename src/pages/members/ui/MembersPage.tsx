"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { avatarSrc, isHeadAdmin, type User } from "@/entities/user";
import { AuthGuard } from "@/features/auth";
import { normalizeApiError } from "@/shared/api";
import { settledData, useLastData } from "@/shared/lib";
import {
  Avatar,
  Badge,
  EmptyState,
  ErrorState,
  ListSkeleton,
  PageHeader,
  PageSkeleton,
  QueryState,
} from "@/shared/ui";
import { memberQueries, type Member } from "../api/members";
import {
  projectRole,
  readSort,
  sortMembers,
  type MemberSort,
} from "../model/members";

export function MembersPage() {
  return (
    <AuthGuard require="work">
      {(user) => (
        <Suspense fallback={<PageSkeleton label="팀원 불러오는 중" />}>
          <MembersContent viewer={user} />
        </Suspense>
      )}
    </AuthGuard>
  );
}

const sortLabels: Readonly<Record<MemberSort, string>> = {
  name: "이름순",
  load: "업무 많은 순",
};

function MembersContent({ viewer }: { readonly viewer: User }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/members";
  const params = new URLSearchParams(useSearchParams()?.toString());
  const sort = readSort(params.get("sort"));
  const members = useQuery(memberQueries.list());
  // 일시 장애면 60초까지만 마지막 목록을 두고(QueryState가 StaleNotice를 그림), 권한·존재 오류(4xx)면 바로 비운다.
  const { data } = useLastData(members);
  // 목록은 useLastData 결과로 그린다(쿼리를 펼치면 모든 필드를 구독하므로 필요한 것만 넘긴다).
  const view = {
    data,
    error: members.error,
    isError: members.isError,
    isPending: members.isPending,
    isFetching: members.isFetching,
    isPlaceholderData: members.isPlaceholderData,
    refetch: members.refetch,
  };
  const count = settledData(view)?.length;
  // 연결 열은 헤드 어드민에게만. 다른 사람은 자기 행 이름 아래에서 자기 연결만 본다.
  const connectionColumn = isHeadAdmin(viewer);

  const changeSort = (next: MemberSort) => {
    const query = new URLSearchParams(params.toString());
    if (next === "name") query.delete("sort");
    else query.set("sort", next);
    const search = query.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, {
      scroll: false,
    });
  };

  return (
    <div className="grid gap-5">
      <PageHeader
        title="팀원"
        subtitle={
          count !== undefined
            ? `활성 팀원 ${count}명`
            : members.isError && !data
              ? "팀원 집계를 불러오지 못했어요"
              : "팀원 집계 중"
        }
      />
      <div className="page-toolbar">
        <div className="ui-segmented" role="group" aria-label="정렬">
          {(["name", "load"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className="ui-segmented-option"
              aria-pressed={sort === option}
              onClick={() => changeSort(option)}
            >
              {sortLabels[option]}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">
          진행 중, 리뷰 수에 개인 업무는 세지 않아요.
        </p>
      </div>
      <QueryState
        query={view}
        skeleton={
          <ListSkeleton
            label="팀원을 불러오는 중"
            rows={5}
            rowClassName="h-14"
          />
        }
        error={(error, retry) => (
          <ErrorState
            title="최신 정보를 불러오지 못했어요"
            description={normalizeApiError(error).message}
            onRetry={retry}
          />
        )}
        empty={<EmptyState title="활성 팀원이 없어요" />}
      >
        {(list) => (
          <table className="members-table">
            <caption className="sr-only">
              활성 팀원의 프로젝트 역할과 진행 중인 업무, 리뷰 담당 업무 수
            </caption>
            <thead>
              <tr>
                <th scope="col">팀원</th>
                <th scope="col">전공</th>
                <th scope="col">프로젝트 역할</th>
                <th scope="col" className="members-number">
                  진행 중
                </th>
                <th scope="col" className="members-number">
                  리뷰
                </th>
                {connectionColumn && <th scope="col">연결</th>}
              </tr>
            </thead>
            <tbody>
              {sortMembers(list, sort).map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  self={member.id === viewer.id}
                  connectionColumn={connectionColumn}
                />
              ))}
            </tbody>
          </table>
        )}
      </QueryState>
    </div>
  );
}

function MemberRow({
  member,
  self,
  connectionColumn,
}: {
  readonly member: Member;
  readonly self: boolean;
  readonly connectionColumn: boolean;
}) {
  return (
    <tr>
      <th scope="row">
        <div className="members-person">
          <Avatar name={member.name} src={avatarSrc(member.avatarUrl)} />
          <span className="min-w-0">
            <span className="members-name">
              {member.name}
              {self && <Badge className="members-badge">나</Badge>}
              {member.role === "LEAD" && (
                <Badge className="members-badge">헤드 어드민</Badge>
              )}
            </span>
            <span className="members-username">{member.username}</span>
            {self && !connectionColumn && member.connections && (
              <Connections value={member.connections} />
            )}
          </span>
        </div>
      </th>
      <td data-label="전공">
        {member.major ?? <span className="text-muted">미입력</span>}
      </td>
      <td data-label="프로젝트 역할">
        {member.projects.length === 0 ? (
          <span className="text-muted">없음</span>
        ) : (
          <ul className="members-projects">
            {member.projects.map((project) => (
              <li key={project.projectId} title={project.name}>
                <span className="font-mono text-xs text-muted">
                  {project.key}
                </span>{" "}
                {projectRole(project)}
              </li>
            ))}
          </ul>
        )}
      </td>
      <td data-label="진행 중" className="members-number">
        <Count value={member.load.inProgress} />
      </td>
      <td data-label="리뷰" className="members-number">
        <Count value={member.load.reviewing} />
      </td>
      {connectionColumn && (
        <td data-label="연결">
          {member.connections && <Connections value={member.connections} />}
        </td>
      )}
    </tr>
  );
}

const Count = ({ value }: { readonly value: number }) => (
  <span className={value === 0 ? "text-muted" : undefined}>{value}</span>
);

function Connections({
  value,
}: {
  readonly value: NonNullable<Member["connections"]>;
}) {
  return (
    <span className="members-connections">
      <span className={value.github ? undefined : "text-muted"}>
        {value.github
          ? `GitHub ${value.githubLogin ?? "연결됨"}`
          : "GitHub 미연결"}
      </span>
      <span className={value.discord ? undefined : "text-muted"}>
        {value.discord ? "Discord 연결됨" : "Discord 미연결"}
      </span>
    </span>
  );
}
