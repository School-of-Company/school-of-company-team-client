import type { QueryClient } from "@tanstack/react-query";
import { subscribeSessionChanges } from "@/entities/user";

export function clearCacheOnSessionChange(client: QueryClient) {
  return subscribeSessionChanges(() => client.clear());
}
