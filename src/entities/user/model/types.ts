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
      return user.discordLinked ? "/me" : "/connect-discord";
  }
}
