import { execFileSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { apiUrl } from "./support";

// 로컬 GitHub REST 스텁 + 서명 웹훅 재현(실제 GitHub 아님). 격리 backend 를 GITHUB_API_URL=http://127.0.0.1:<port>,
// 가짜 GITHUB_APP_ID·로컬 RSA 키로 띄웠을 때만 쓴다(계획 3.3-6·7). 응답 모양은 GitHub REST 문서 기준이며
// 단계 2 검증(V-2) 스텁과 같은 경로만 답한다.

/** 실행(seed.run)마다 같은 시험 팀원 GitHub ID. 여러 e2e 파일이 한 실행에서 같은 연결 행을 쓴다. */
export const memberGithubId = (run: string) => 2_000_000 + parseInt(run, 16);

export type StubPull = {
  title: string;
  sha: string;
  ref: string;
  state: "open" | "closed";
  draft: boolean;
  merged: boolean;
  updatedAt: string;
  requested: number[];
};
export type StubState = {
  installationId: number;
  /** private 를 true 로 바꾸면 비공개 전환을 흉내 낸다. */
  repo: { id: number; fullName: string; private?: boolean };
  /** login → 저장소 권한. 없으면 write. "none" 이면 404(권한 없음). */
  permissions?: Record<string, string>;
  logins: Record<number, string>;
  pulls: Record<number, StubPull>;
  suites: { id: number; head_sha: string; conclusion: string }[];
};

const user = (state: StubState, id: number) => ({
  id,
  login: state.logins[id],
  type: "User",
});

export const repository = (state: StubState) => {
  const [owner, name] = state.repo.fullName.split("/");
  return {
    id: state.repo.id,
    name,
    full_name: state.repo.fullName,
    private: state.repo.private ?? false,
    archived: false,
    has_issues: true,
    owner: { login: owner },
    html_url: `https://github.com/${state.repo.fullName}`,
  };
};

export function pullJson(state: StubState, number: number, author: number) {
  const pull = state.pulls[number];
  return {
    id: 90_000 + number,
    number,
    title: pull.title,
    body: "",
    state: pull.state,
    draft: pull.draft,
    merged: pull.merged,
    merged_at: pull.merged ? pull.updatedAt : null,
    closed_at: pull.state === "closed" ? pull.updatedAt : null,
    html_url: `https://github.com/${state.repo.fullName}/pull/${number}`,
    updated_at: pull.updatedAt,
    user: user(state, author),
    head: { sha: pull.sha, ref: pull.ref },
    base: { ref: "main" },
    labels: [],
    assignees: [],
    requested_reviewers: pull.requested.map((id) => user(state, id)),
    requested_teams: [],
  };
}

function route(state: StubState, path: string): [number, unknown] {
  const notFound: [number, unknown] = [404, { message: "Not Found" }];
  if (/^\/app\/installations\/\d+\/access_tokens$/.test(path))
    return [
      201,
      {
        token: "stub-token",
        expires_at: new Date(Date.now() + 3_600_000).toISOString(),
      },
    ];
  if (path === "/app/installations")
    return [200, [{ id: state.installationId, account: { login: "acme" } }]];
  if (path === "/installation/repositories")
    return [200, { total_count: 1, repositories: [repository(state)] }];
  const userMatch = path.match(/^\/user\/(\d+)$/);
  if (userMatch)
    return state.logins[Number(userMatch[1])]
      ? [200, user(state, Number(userMatch[1]))]
      : notFound;
  const prefix = `/repos/${state.repo.fullName}`;
  if (!path.startsWith(prefix)) return notFound;
  const rest = path.slice(prefix.length);
  if (rest === "") return [200, repository(state)];
  if (rest === "/installation") return [200, { id: state.installationId }];
  if (rest === "/issues") return [200, []];
  const permission = rest.match(/^\/collaborators\/([^/]+)\/permission$/);
  if (permission) {
    const login = decodeURIComponent(permission[1]);
    const level = state.permissions?.[login] ?? "write";
    return level === "none"
      ? notFound
      : [200, { permission: level, role_name: level, user: { login } }];
  }
  if (/^\/assignees\/[^/]+$/.test(rest)) return [204, undefined];
  const pr = rest.match(/^\/(issues|pulls)\/(\d+)(\/.*)?$/);
  if (pr) {
    const number = Number(pr[2]);
    if (!state.pulls[number]) return notFound;
    const body = pullJson(state, number, Number(Object.keys(state.logins)[0]));
    if (!pr[3])
      return [
        200,
        pr[1] === "issues"
          ? {
              ...body,
              pull_request: {
                url: `https://api.github.com${prefix}/pulls/${number}`,
              },
            }
          : body,
      ];
    if (pr[3] === "/reviews") return [200, []];
    if (pr[3] === "/requested_reviewers")
      return [200, { users: body.requested_reviewers, teams: [] }];
  }
  const suites = rest.match(/^\/commits\/([0-9a-f]+)\/check-suites$/);
  if (suites) {
    const list = state.suites
      .filter((suite) => suite.head_sha === suites[1])
      .map((suite) => ({
        ...suite,
        status: "completed",
        app: { slug: "github-actions" },
      }));
    return [200, { total_count: list.length, check_suites: list }];
  }
  return notFound;
}

export function startGithubStub(state: StubState, port: number) {
  return new Promise<Server>((resolve) => {
    const server = createServer((request, response) => {
      const [status, body] = route(state, (request.url ?? "").split("?")[0]);
      const data = body === undefined ? "" : JSON.stringify(body);
      response.writeHead(status, { "content-type": "application/json" });
      response.end(data);
    });
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

/** 시험 비밀값으로 서명한 웹훅을 보낸다. */
export async function sendWebhook(event: string, payload: unknown) {
  const secret = process.env.E2E_GITHUB_WEBHOOK_SECRET!;
  const body = JSON.stringify(payload);
  const response = await fetch(`${apiUrl}/api/v1/github/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-github-event": event,
      "x-github-delivery": randomUUID(),
      "x-hub-signature-256": `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`,
    },
    body,
  });
  if (!response.ok)
    throw new Error(
      `webhook ${event} → ${response.status} ${await response.text()}`,
    );
}

/**
 * 시험 사용자의 GITHUB·DISCORD 연결 행만 격리 DB 에 넣는다(계획 3.3-7에서 허용한 유일한 직접 SQL).
 * 넣은 SQL 을 돌려줘 증거(seed.sql)로 남긴다.
 */
export function insertOAuthRows(
  container: string,
  rows: readonly { userId: string; githubId: number; login: string }[],
) {
  const sql = rows
    .flatMap(({ userId, githubId, login }, index) => [
      `INSERT INTO user_oauth_accounts (id, user_id, provider, provider_user_id, provider_login) VALUES ('01E2ES5GH${String(index).padStart(2, "0")}${userId.slice(-15)}', '${userId}', 'GITHUB', '${githubId}', '${login}') ON CONFLICT DO NOTHING;`,
      `INSERT INTO user_oauth_accounts (id, user_id, provider, provider_user_id, provider_login) VALUES ('01E2ES5DC${String(index).padStart(2, "0")}${userId.slice(-15)}', '${userId}', 'DISCORD', '9${String(githubId).padStart(17, "0")}', '${login}-discord') ON CONFLICT DO NOTHING;`,
    ])
    .join("\n");
  execFileSync(
    "docker",
    ["exec", "-i", container, "psql", "-q", "-U", "official", "-d", "official"],
    { input: sql },
  );
  return sql;
}
