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
  projectLinks: (projectId: string) =>
    `/projects/${encodeURIComponent(projectId)}/links`,
  projectWhiteboards: (projectId: string) =>
    `/projects/${encodeURIComponent(projectId)}/whiteboards`,
  projectCalendar: (projectId: string) =>
    `/projects/${encodeURIComponent(projectId)}/calendar`,
  projectRequirements: (projectId: string) =>
    `/projects/${encodeURIComponent(projectId)}/requirements`,
  requirements: "/requirements",
  requirement: (id: string) => `/requirements/${encodeURIComponent(id)}`,
  calendar: "/calendar",
  task: (taskId: string) => `/tasks/${encodeURIComponent(taskId)}`,
  services: "/services",
  service: (key: string) => `/services/${encodeURIComponent(key)}`,
  incidents: "/incidents",
  incident: (id: string) => `/incidents/${encodeURIComponent(id)}`,
  docs: "/docs",
  labs: "/labs",
  lab: (id: string) => `/labs/${encodeURIComponent(id)}`,
  whiteboards: "/whiteboards",
  whiteboard: (id: string) => `/whiteboards/${encodeURIComponent(id)}`,
  culture: "/culture",
  guide: "/guide",
  doc: (id: string) => `/docs/${encodeURIComponent(id)}`,
  admin: "/admin",
  account: "/account",
} as const;

export const BOARD_POLL_INTERVAL = 10_000;
