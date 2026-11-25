import { userDestination, type User } from "@/entities/user";

const KEY = "soc.return-path";
/** 로그인을 끝내지 않고 떠난 탭에서 한참 뒤 로그인할 때 옛 주소로 끌려가지 않게 한다. */
const TTL_MS = 30 * 60 * 1000;

/**
 * 같은 출처의 상대 경로만 받는다(열린 리디렉트 방지). `//host`, `/\host` 는 브라우저가 다른 출처로 읽는다.
 * 로그인·OAuth 콜백·승인 대기 화면으로 되돌아가면 돌고 돌기만 한다.
 */
export function safeReturnPath(path: unknown): string | null {
  if (typeof path !== "string" || path.length > 2048) return null;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\"))
    return null;
  let url: URL;
  try {
    url = new URL(path, "https://origin.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "https://origin.invalid") return null;
  // 입력이 아니라 정규화한 결과를 본다: `/.//host`, `/x/..//host` 는 정리되면 `//host` 가 된다.
  // 인코딩한 `/`, `\` 도 거른다(앱 경로에는 쓰지 않고, 어디선가 디코드되면 다른 출처가 된다).
  if (
    url.pathname.startsWith("//") ||
    url.pathname.includes("\\") ||
    /%(2f|5c)/i.test(url.pathname)
  )
    return null;
  if (/^\/(login|auth|pending|connect-discord)(\/|$)/.test(url.pathname))
    return null;
  if (url.pathname === "/" && !url.search && !url.hash) return null;
  return url.pathname + url.search + url.hash;
}

/**
 * 로그인 화면으로 보내기 전에 지금 주소를 적어 둔다. 세션 토큰처럼 sessionStorage 에 둔다:
 * GitHub·Discord 왕복은 같은 탭에서 일어나므로 남고, 다른 탭으로 새지 않는다.
 */
export function rememberReturnPath(
  location: Pick<Location, "pathname" | "search" | "hash"> = window.location,
  storage: Pick<Storage, "setItem"> = sessionStorage,
  now = Date.now(),
) {
  const path = safeReturnPath(
    location.pathname + location.search + location.hash,
  );
  // 돌아갈 필요가 없는 주소(홈, 로그인 흐름)에서는 적어 둔 주소를 건드리지 않는다.
  // 지우는 것은 꺼내 쓸 때(takeReturnPath)뿐이다. 오래된 값은 TTL 로 버린다.
  if (path) storage.setItem(KEY, JSON.stringify({ path, at: now }));
}

/** 적어 둔 주소를 한 번만 꺼낸다. 꺼내면 지운다. */
export function takeReturnPath(
  storage: Pick<Storage, "getItem" | "removeItem"> = sessionStorage,
  now = Date.now(),
): string | null {
  const raw = storage.getItem(KEY);
  if (raw === null) return null;
  storage.removeItem(KEY);
  try {
    const saved = JSON.parse(raw) as { path?: unknown; at?: unknown };
    if (
      typeof saved.at !== "number" ||
      now - saved.at > TTL_MS ||
      now < saved.at
    )
      return null;
    return safeReturnPath(saved.path);
  } catch {
    return null;
  }
}

/** 로그인이 끝난 뒤 갈 곳. 일할 수 있는 사용자만 적어 둔 주소로 돌아가고, 아니면 그 상태의 화면이 먼저다. */
export function postLoginDestination(
  user: User,
  storage: Pick<Storage, "getItem" | "removeItem"> = sessionStorage,
  now = Date.now(),
): string {
  const destination = userDestination(user);
  return destination === "/"
    ? (takeReturnPath(storage, now) ?? destination)
    : destination;
}
