export const routes = {
  login: "/login",
  pending: "/pending",
  connectDiscord: "/connect-discord",
  me: "/me",
  team: "/team",
  projects: "/projects",
  project: (projectId: string) => `/projects/${encodeURIComponent(projectId)}`,
  projectSettings: (projectId: string) =>
    `/projects/${encodeURIComponent(projectId)}/settings`,
  task: (taskId: string) => `/tasks/${encodeURIComponent(taskId)}`,
  services: "/services",
  service: (key: string) => `/services/${encodeURIComponent(key)}`,
  incidents: "/incidents",
  incident: (id: string) => `/incidents/${encodeURIComponent(id)}`,
  docs: "/docs",
  doc: (id: string) => `/docs/${encodeURIComponent(id)}`,
  admin: "/admin",
  account: "/account",
} as const;

export const BOARD_POLL_INTERVAL = 10_000;
