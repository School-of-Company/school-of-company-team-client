export type GuardView = "loading" | "error" | "content";

/**
 * Order matters for hydration: until the session store is ready (server render
 * and the hydration pass both report not-ready) the guard must render exactly
 * what the server rendered — the loading state — even if the `me` query has
 * already failed in the client cache. Errors show only after hydration.
 */
export function guardView(state: {
  readonly ready: boolean;
  readonly hasToken: boolean;
  readonly isError: boolean;
  readonly hasUser: boolean;
  readonly redirecting: boolean;
}): GuardView {
  if (!state.ready) return "loading";
  if (state.isError) return "error";
  if (!state.hasToken || !state.hasUser || state.redirecting) return "loading";
  return "content";
}
