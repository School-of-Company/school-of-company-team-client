import type { Page } from "@playwright/test";
import type { TaskDetail, TaskStatus } from "../src/entities/task/model/types";
import type { ProjectDetail } from "../src/entities/project/model/types";

export const taskFixture: TaskDetail = {
  id: "detail-feedback",
  key: "SOC-42",
  seq: 42,
  scope: "PERSONAL",
  projectId: null,
  projectKey: null,
  projectName: null,
  title: "업무 상세 화면의 읽기 흐름 개선",
  description:
    "## 목표\n설명과 속성을 구분해 업무의 맥락을 빠르게 이해할 수 있게 합니다.\n\n### 확인할 것\n- [x] 제목과 설명의 위계 정리\n- [ ] 모바일에서도 편안한 본문 너비\n\n**담당자**는 변경 내용을 확인하고 [가이드](https://example.com)를 참고해 주세요.\n\n```ts\nconst readable = true;\n```",
  type: "DEV",
  status: "IN_PROGRESS",
  priority: "P1",
  assignees: [{ id: "member", name: "김민지", username: "minji" }],
  reviewers: [{ id: "reviewer", name: "이서준", username: "seojun" }],
  part: { id: "frontend", name: "프론트엔드" },
  startDate: "2026-11-23",
  deadline: "2026-11-30",
  blocked: false,
  blockedReason: null,
  position: 1,
  completedAt: null,
  createdBy: "member",
  createdAt: "2026-11-23T00:00:00Z",
  updatedAt: "2026-11-23T00:00:00Z",
};

export async function stubDetail(
  page: Page,
  scope: TaskDetail["scope"] = "PERSONAL",
) {
  const project: ProjectDetail = {
    id: "fixture-project",
    key: "SOC",
    name: "팀 업무 도구",
    description: null,
    archived: false,
    visibility: "TEAM",
    pmUserId: "member",
    stage: "DEVELOPMENT",
    kind: "INTERNAL",
    workflow: "KANBAN",
    createdAt: taskFixture.createdAt,
    members: [{ userId: "member", name: "김민지", pm: true }],
    parts: [],
  };
  let task = {
    ...taskFixture,
    scope,
    ...(scope === "PROJECT"
      ? {
          projectId: project.id,
          projectKey: project.key,
          projectName: project.name,
          sprint: { id: "sprint", name: "11월 4주", status: "ACTIVE" as const },
          milestone: {
            id: "milestone",
            name: "사용성 개선",
            dueDate: "2026-11-30",
          },
        }
      : {}),
  };
  await page.addInitScript(() => {
    sessionStorage.setItem("soc.access-token", "fixture-access");
    sessionStorage.setItem("soc.refresh-token", "fixture-refresh");
  });
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    let body: unknown = [];
    if (path === `/api/v1/projects/${project.id}`) body = project;
    if (path === "/api/v1/projects")
      body = scope === "PROJECT" ? [project] : [];
    if (path === "/api/v1/me")
      body = {
        id: "member",
        name: "김민지",
        username: "minji",
        major: null,
        role: "MEMBER",
        status: "ACTIVE",
        githubId: null,
        githubLogin: null,
        discordLinked: false,
        discordUsername: null,
        createdAt: task.createdAt,
      };
    if (path === `/api/v1/tasks/${task.id}/github`)
      body = { publication: null, source: null, links: [] };
    if (path === `/api/v1/tasks/${task.id}/position` && method === "PATCH") {
      const change: { status: TaskStatus } = route.request().postDataJSON();
      task = { ...task, status: change.status };
      body = task;
    }
    if (path === `/api/v1/tasks/${task.id}`) {
      if (method === "PATCH")
        task = { ...task, ...route.request().postDataJSON() };
      body = task;
    }
    if (path.endsWith("/board")) {
      const columns = {
        BACKLOG: [],
        PLANNED: [],
        IN_PROGRESS: [task],
        REVIEW: [],
        DONE: [],
      };
      body = {
        groups: [{ key: null, label: "내 업무", columns }],
        counts: { BACKLOG: 0, PLANNED: 0, IN_PROGRESS: 1, REVIEW: 0, DONE: 0 },
      };
    }
    await route.fulfill({ json: body });
  });
}
