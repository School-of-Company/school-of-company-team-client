import { api } from "@/shared/api";
import { replaceSession, type SessionTokens } from "@/entities/user";

export async function unlinkDiscord() {
  const { data } = await api.delete<SessionTokens>("/api/v1/me/discord");
  replaceSession(data);
}
