// 상태 토큰(D12-8): 32바이트 base64url(43자). 서버는 해시만 둔다.
// 경로·쿼리에 넣으면 접근 로그와 Referer 에 남으므로 URL fragment(`#토큰`)로만 전달하고 API 에는 헤더로 보낸다.

export const STATUS_TOKEN_HEADER = "X-Intake-Token";
export const STATUS_PATH = "/intake/status";

const TOKEN = /^[A-Za-z0-9_-]{20,128}$/;

const valid = (value: string) => {
  const token = value.trim();
  return TOKEN.test(token) ? token : null;
};

/** `location.hash`(`#토큰`)에서 토큰을 읽는다. 형식이 아니면 null. */
export function statusTokenFromHash(hash: string): string | null {
  return valid(hash.replace(/^#/, ""));
}

/** 입력란 값: 토큰만 붙여 넣었거나 상태 링크 전체를 붙여 넣은 경우 모두 받는다. */
export function statusTokenFromInput(input: string): string | null {
  const text = input.trim();
  const hash = text.indexOf("#");
  return valid(hash >= 0 ? text.slice(hash + 1) : text);
}

/** 요청자에게 한 번 보여 주는 상태 링크. 토큰은 fragment 에만 둔다. */
export function statusLink(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}${STATUS_PATH}#${token}`;
}

export const statusTokenHeaders = (token: string) => ({
  [STATUS_TOKEN_HEADER]: token,
});
