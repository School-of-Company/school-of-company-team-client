import { api } from "@/shared/api";
import { replaceSession, type SessionTokens } from "@/entities/user";

export type OAuthProvider = "github" | "discord";

interface AuthorizeResponse {
  readonly authorizeUrl: string;
  readonly state: string;
  readonly binding: string;
}

export class OAuthCallbackError extends Error {
  constructor(readonly code: "OAUTH_STATE_INVALID" | "OAUTH_CANCELLED") {
    super(code);
    this.name = "OAuthCallbackError";
  }
}

function endpoint(provider: OAuthProvider) {
  return provider === "github" ? "/api/v1/auth/github" : "/api/v1/me/discord";
}

export async function beginOAuth(provider: OAuthProvider) {
  const { data } = await api.post<AuthorizeResponse>(
    `${endpoint(provider)}/authorize`,
  );
  const url = new URL(data.authorizeUrl);
  const expectedHost = provider === "github" ? "github.com" : "discord.com";
  if (url.protocol !== "https:" || url.hostname !== expectedHost) {
    throw new OAuthCallbackError("OAUTH_STATE_INVALID");
  }
  sessionStorage.setItem(data.state, data.binding);
  window.location.assign(url.href);
}

// Share the one-shot exchange across Strict Mode effect remounts.
const exchanges = new Map<string, Promise<void>>();

export function completeOAuth(
  provider: OAuthProvider,
  search: string,
): Promise<void> {
  const params = new URLSearchParams(search);
  const state = params.get("state");
  const key = `${provider}:${state}`;
  const existing = exchanges.get(key);
  if (existing) return existing;

  const exchange = (async () => {
    const binding = state ? sessionStorage.getItem(state) : null;
    if (state) sessionStorage.removeItem(state);
    if (params.has("error")) throw new OAuthCallbackError("OAUTH_CANCELLED");
    const code = params.get("code");
    if (
      !state ||
      !binding ||
      !code ||
      state.length > 128 ||
      binding.length > 128 ||
      code.length > 512
    ) {
      throw new OAuthCallbackError("OAUTH_STATE_INVALID");
    }
    const { data } = await api.post<SessionTokens>(
      `${endpoint(provider)}/callback`,
      { code, state, binding },
    );
    replaceSession(data);
  })();
  exchanges.set(key, exchange);
  return exchange;
}
