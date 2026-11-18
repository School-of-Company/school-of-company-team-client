import type { ProjectDetail } from "@/entities/project";

export function getSettingsPermissions(
  actor: { readonly id: string; readonly role: "LEAD" | "MEMBER" },
  project: ProjectDetail,
) {
  const headAdmin = actor.role === "LEAD";
  const manager = headAdmin || project.pmUserId === actor.id;
  return {
    assignPm: headAdmin && !project.archived,
    manage: manager && !project.archived,
    archive: manager,
    assignPartMembers: (leaderUserId: string | null) =>
      !project.archived && (manager || leaderUserId === actor.id),
  };
}
