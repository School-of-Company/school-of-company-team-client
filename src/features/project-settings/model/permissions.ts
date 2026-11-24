import { projectAccess, type ProjectDetail } from "@/entities/project";

export function getSettingsPermissions(
  actor: { readonly id: string; readonly role: "LEAD" | "MEMBER" },
  project: ProjectDetail,
) {
  const headAdmin = actor.role === "LEAD";
  const manager = projectAccess(project, actor).manages;
  return {
    assignPm: headAdmin && !project.archived,
    manage: manager && !project.archived,
    archive: manager,
  };
}
