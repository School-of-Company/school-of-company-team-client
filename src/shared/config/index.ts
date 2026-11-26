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
  /** section 은 설정 섹션 경로(members, integrations 등). 없으면 기본 정보다. */
  projectSettings: (projectId: string, section?: string) =>
    `/projects/${encodeURIComponent(projectId)}/settings${section ? `/${section}` : ""}`,
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
  projectDocs: (projectId: string) =>
    `/projects/${encodeURIComponent(projectId)}/docs`,
  requirements: "/requirements",
  requirement: (id: string) => `/requirements/${encodeURIComponent(id)}`,
  calendar: "/calendar",
  task: (taskId: string) => `/tasks/${encodeURIComponent(taskId)}`,
  /** 운영: 상태(기본), 장애, 서비스, 배포 탭. 옛 /services, /incidents 는 next.config 에서 이 탭으로 보낸다. */
  ops: "/ops",
  services: "/ops?tab=services",
  service: (key: string) => `/services/${encodeURIComponent(key)}`,
  serviceDeploys: (key: string) =>
    `/ops?tab=deploys&service=${encodeURIComponent(key)}`,
  incidents: "/ops?tab=incidents",
  incident: (id: string) => `/incidents/${encodeURIComponent(id)}`,
  docs: "/docs",
  labs: "/labs",
  lab: (id: string) => `/labs/${encodeURIComponent(id)}`,
  whiteboards: "/whiteboards",
  whiteboard: (id: string) => `/whiteboards/${encodeURIComponent(id)}`,
  stats: "/stats",
  culture: "/culture",
  guide: "/guide",
  doc: (id: string) => `/docs/${encodeURIComponent(id)}`,
  admin: "/admin",
  account: "/account",
} as const;

export const BOARD_POLL_INTERVAL = 10_000;
