export const routes = {
  login: "/login",
  pending: "/pending",
  connectDiscord: "/connect-discord",
  home: "/",
  me: "/me",
  members: "/members",
  team: "/team",
  projects: "/projects",
  project: (projectId: string) => `/projects/${encodeURIComponent(projectId)}`,
  projectSettings: (projectId: string) =>
    `/projects/${encodeURIComponent(projectId)}/settings`,
  projectSprints: (projectId: string) =>
    `/projects/${encodeURIComponent(projectId)}/sprints`,
  projectSprint: (projectId: string, sprintId: string) =>
    `/projects/${encodeURIComponent(projectId)}/sprints/${encodeURIComponent(sprintId)}`,
  projectMilestones: (projectId: string) =>
    `/projects/${encodeURIComponent(projectId)}/milestones`,
  task: (taskId: string) => `/tasks/${encodeURIComponent(taskId)}`,
  admin: "/admin",
  account: "/account",
} as const;

export const BOARD_POLL_INTERVAL = 10_000;
