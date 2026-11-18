export type Project = {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly description: string | null;
  readonly archived: boolean;
  readonly visibility: "TEAM" | "MEMBERS";
  readonly pmUserId: string | null;
  readonly createdAt: string;
};
export type ProjectDetail = Project & {
  readonly members: readonly {
    readonly userId: string;
    readonly name: string;
    readonly pm: boolean;
  }[];
  readonly parts: readonly {
    readonly id: string;
    readonly name: string;
    readonly leaderUserId: string | null;
    readonly memberUserIds: readonly string[];
  }[];
};

export function projectAccess(
  project: ProjectDetail,
  user: { readonly id: string; readonly role: string },
) {
  const manages = user.role === "LEAD" || project.pmUserId === user.id;
  const participates = project.members.some(
    (member) => member.userId === user.id,
  );
  return {
    manages,
    participates,
    editable: !project.archived && (manages || participates),
  };
}
