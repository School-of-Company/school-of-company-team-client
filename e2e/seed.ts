import { mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { apiUrl, seedFile, type Seed, type Tokens } from "./support";

// 시드는 API 호출로만 만든다(직접 SQL 금지). 실행마다 새 사용자·프로젝트를 만들어 재실행이 서로 엉키지 않는다.
async function call<T>(
  path: string,
  init: RequestInit & { token?: string } = {},
) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
    },
  });
  if (!response.ok)
    throw new Error(
      `${init.method ?? "GET"} ${path} → ${response.status} ${await response.text()}`,
    );
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const login = (username: string, password: string) =>
  call<Tokens>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export default async function seed() {
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;
  if (!adminPassword)
    throw new Error(
      "E2E_ADMIN_PASSWORD 가 필요합니다(backend ADMIN_PASSWORD).",
    );
  const run = randomBytes(3).toString("hex");
  const admin = await login(
    process.env.E2E_ADMIN_USERNAME ?? "admin",
    adminPassword,
  );

  async function approvedUser(role: string) {
    const username = `e2e_${role}_${run}`;
    const password = randomBytes(12).toString("hex");
    const { id } = await call<{ id: string }>("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, password, name: `E2E ${role} ${run}` }),
    });
    await call(`/api/v1/admin/users/${id}/approve`, {
      method: "POST",
      token: admin.accessToken,
    });
    return {
      id,
      name: `E2E ${role} ${run}`,
      tokens: await login(username, password),
    };
  }

  const member = await approvedUser("member");
  const outsider = await approvedUser("outsider");
  const key = `E${run.toUpperCase().replace(/[^A-Z0-9]/g, "")}`.slice(0, 10);
  const project = await call<{ id: string; key: string; name: string }>(
    "/api/v1/projects",
    {
      method: "POST",
      token: admin.accessToken,
      body: JSON.stringify({
        key,
        name: `E2E 점검 ${run}`,
        visibility: "MEMBERS",
      }),
    },
  );
  await call(`/api/v1/projects/${project.id}/members`, {
    method: "POST",
    token: admin.accessToken,
    body: JSON.stringify({ userId: member.id }),
  });

  const data: Seed = { run, admin, member, outsider, project };
  mkdirSync("e2e/.auth", { recursive: true });
  writeFileSync(seedFile, JSON.stringify(data), { mode: 0o600 });
}
