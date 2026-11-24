export type ApiTokenScope = "READ" | "WRITE";

export interface ApiToken {
  readonly id: string;
  readonly name: string;
  readonly scope: ApiTokenScope;
  readonly prefix: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly lastUsedAt: string | null;
  readonly expired: boolean;
}

export interface CreateApiToken {
  readonly name: string;
  readonly scope: ApiTokenScope;
  readonly expiresInDays: number;
}

export interface CreatedApiToken {
  readonly id: string;
  readonly name: string;
  readonly scope: ApiTokenScope;
  readonly prefix: string;
  readonly token: string;
  readonly expiresAt: string;
  readonly createdAt: string;
}

export const scopeLabels: Record<ApiTokenScope, string> = {
  READ: "읽기",
  WRITE: "쓰기",
};

export const expiryOptions = [7, 30, 90] as const;

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

export const claudeCodeSnippet = (endpoint: string, token: string) =>
  `claude mcp add --transport http hub ${endpoint} --header "Authorization: Bearer ${token}"`;

// ponytail: 서버 docs/spec/s13-mcp.md 가 아직 없어 Codex streamable HTTP 설정(url + http_headers)을 그대로 쓴다.
export const codexSnippet = (endpoint: string, token: string) =>
  `[mcp_servers.hub]\nurl = "${endpoint}"\nhttp_headers = { Authorization = "Bearer ${token}" }`;
