export type UserStatus = "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";

export interface User {
  readonly id: string;
  readonly username: string;
  readonly name: string;
  readonly major: string | null;
  readonly role: "MEMBER" | "LEAD";
  readonly status: UserStatus;
  readonly createdAt: string;
  readonly githubId: number | null;
  readonly githubLogin: string | null;
  readonly discordLinked: boolean;
  readonly discordUsername: string | null;
  /** Uploaded photo (API-relative path) or GitHub photo, resolved by the API. */
  readonly avatarUrl?: string | null;
}

export interface SessionTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly scope: "WORK" | "ONBOARDING";
}

export interface UpdateProfile {
  readonly name: string;
  readonly major?: string;
}

/** The API sends its own uploads as a path relative to the API server. */
export const avatarSrc = (url: string | null | undefined) =>
  url
    ? url.startsWith("/")
      ? `${process.env.NEXT_PUBLIC_API_URL ?? ""}${url}`
      : url
    : undefined;

export const userAvatarUrl = (user: User | undefined) =>
  avatarSrc(user?.avatarUrl) ??
  (user?.githubId
    ? `https://avatars.githubusercontent.com/u/${user.githubId}?s=112`
    : undefined);

export const isHeadAdmin = (user: User | undefined) =>
  user?.status === "ACTIVE" && user.role === "LEAD";

export function userDestination(
  user: User,
): "/pending" | "/connect-discord" | "/me" {
  switch (user.status) {
    case "PENDING":
    case "REJECTED":
    case "SUSPENDED":
      return "/pending";
    case "ACTIVE":
      // 서버 AccessGate 와 같은 규칙: GitHub 미연결 비밀번호 계정(legacy 모드 전용)은 Discord 연결 없이 WORK 다.
      // 운영 OAuth 모드에서는 서버가 이런 계정의 토큰을 거부하므로 여기까지 오지 않는다.
      return user.discordLinked || user.githubId === null
        ? "/me"
        : "/connect-discord";
  }
}
