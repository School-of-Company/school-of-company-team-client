export type ApiTokenScope = "READ" | "WRITE";

export interface ApiToken {
  readonly id: string;
  readonly name: string;
  readonly scope: ApiTokenScope;
  readonly prefix: string;
  /** null = 모든 프로젝트, [] = 한정 프로젝트가 모두 지워져 아무것도 못 본다. */
  readonly projectKeys: readonly string[] | null;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly lastUsedAt: string | null;
  readonly expired: boolean;
}

export interface CreateApiToken {
  readonly name: string;
  readonly scope: ApiTokenScope;
  readonly expiresInDays: number;
  /** 생략 = 모든 프로젝트. 있으면 1~20개. */
  readonly projectKeys?: readonly string[];
}

export interface CreatedApiToken {
  readonly id: string;
  readonly name: string;
  readonly scope: ApiTokenScope;
  readonly prefix: string;
  readonly token: string;
  readonly projectKeys: readonly string[] | null;
  readonly expiresAt: string;
  readonly createdAt: string;
}

export const scopeLabels: Record<ApiTokenScope, string> = {
  READ: "읽기",
  WRITE: "쓰기",
};

export const MAX_TOKEN_PROJECTS = 20;

const presetDays = [7, 30, 90] as const;

/** 만료 선택지. 팀 정책 한도를 넘는 값은 막고, 한도가 목록에 없으면 한도 자체를 고를 수 있게 더한다. */
export function expiryOptions(maxTokenDays: number) {
  const days = [...new Set([...presetDays, maxTokenDays])]
    .filter((value) => value >= 1 && value <= 90)
    .sort((a, b) => a - b);
  return days.map((value) => ({ days: value, allowed: value <= maxTokenDays }));
}

/** 서버 기본값과 같다: min(30, maxTokenDays). */
export const defaultExpiry = (maxTokenDays: number) =>
  Math.min(30, maxTokenDays);

export interface TokenFormInput {
  readonly name: string;
  readonly scope: ApiTokenScope;
  readonly expiresInDays: number;
  readonly restricted: boolean;
  readonly projectKeys: readonly string[];
}

/** 만들기 요청. 프로젝트를 지정했으면 1~20개여야 한다. */
export function tokenRequest(
  input: TokenFormInput,
): { readonly body: CreateApiToken } | { readonly error: string } {
  const name = input.name.trim();
  if (!name) return { error: "이름을 적어 주세요." };
  const keys = [
    ...new Set(input.projectKeys.map((key) => key.trim().toUpperCase())),
  ].filter(Boolean);
  if (input.restricted && keys.length === 0)
    return { error: "프로젝트를 하나 이상 골라 주세요." };
  if (input.restricted && keys.length > MAX_TOKEN_PROJECTS)
    return { error: `프로젝트는 ${MAX_TOKEN_PROJECTS}개까지 고를 수 있어요.` };
  return {
    body: {
      name,
      scope: input.scope,
      expiresInDays: input.expiresInDays,
      ...(input.restricted ? { projectKeys: keys } : {}),
    },
  };
}

/**
 * 만들기 대화상자 상태. 평문 토큰은 `created` 에만 있고, 닫거나 화면을 떠나면 통째로 버린다.
 * localStorage·sessionStorage·query/mutation cache·로그 어디에도 두지 않는다.
 * `generation` 은 열 때마다 늘어, 닫았다 다시 연 대화상자가 이전 요청의 응답을 받지 않게 한다.
 */
export type TokenDialog =
  | { readonly open: false; readonly generation: number }
  | {
      readonly open: true;
      readonly generation: number;
      readonly created: CreatedApiToken | null;
    };

export type TokenDialogAction =
  | { readonly type: "open" }
  | {
      readonly type: "created";
      readonly generation: number;
      readonly token: CreatedApiToken;
    }
  | { readonly type: "close" };

export const closedTokenDialog: TokenDialog = { open: false, generation: 0 };

export function tokenDialogReducer(
  state: TokenDialog,
  action: TokenDialogAction,
): TokenDialog {
  switch (action.type) {
    case "open":
      return { open: true, generation: state.generation + 1, created: null };
    case "created":
      return state.open &&
        state.generation === action.generation &&
        !state.created
        ? { ...state, created: action.token }
        : state;
    case "close":
      return state.open ? { open: false, generation: state.generation } : state;
  }
}

/**
 * effect cleanup 을 돌려준다. 화면이 숨겨지거나(Next cacheComponents 의 Activity hidden) 언마운트될 때 불린다.
 * 공용 Dialog 는 이때 onClose 없이 조용히 닫히므로, 여기서 직접 토큰을 버린다.
 */
export const discardTokenOnHide =
  (dispatch: (action: TokenDialogAction) => void) => () =>
    dispatch({ type: "close" });

export const mcpEndpoint = (apiUrl: string) =>
  `${apiUrl.replace(/\/+$/, "")}/mcp`;

// 서버 docs/spec/s20-mcp-v2.md 5절. 둘 다 토큰을 HUB_TOKEN 셸 변수로 받는다.
// Claude Code 는 add 할 때 셸이 펼친 헤더 값(토큰 원문)을 사용자 설정(~/.claude.json)에 저장한다.
// 그래서 저장소에 남는 .mcp.json(project 범위) 대신 --scope user 로 넣는다.
// Codex 는 설정에 변수 이름만 두고 실행할 때 환경 변수에서 읽는다.
export const claudeCodeSnippet = (endpoint: string) =>
  `claude mcp add --scope user --transport http hub "${endpoint}" --header "Authorization: Bearer $HUB_TOKEN"`;

export const codexSnippet = (endpoint: string) =>
  `[mcp_servers.hub]\nurl = "${endpoint}"\nbearer_token_env_var = "HUB_TOKEN"`;
