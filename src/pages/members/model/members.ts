import type { Member } from "../api/members";

export type MemberSort = "name" | "load";

export const readSort = (value: string | null): MemberSort =>
  value === "load" ? "load" : "name";

/** 이름순은 서버 순서 그대로. 부하순은 진행 중 + 리뷰가 많은 사람부터, 같으면 서버 순서. */
export function sortMembers(members: readonly Member[], sort: MemberSort) {
  if (sort === "name") return members;
  const total = (member: Member) =>
    member.load.inProgress + member.load.reviewing;
  return members
    .map((member, index) => ({ member, index }))
    .sort((a, b) => total(b.member) - total(a.member) || a.index - b.index)
    .map(({ member }) => member);
}

/** 프로젝트별 역할 한 줄: "PM, 서버", "서버, 웹", 파트가 없으면 "참여". */
export function projectRole(project: Member["projects"][number]) {
  const roles = [
    ...(project.pm ? ["PM"] : []),
    ...project.parts.map((part) => part.name),
  ];
  return roles.length ? roles.join(", ") : "참여";
}
