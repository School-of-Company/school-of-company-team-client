import axios, { type InternalAxiosRequestConfig } from "axios";
import { normalizeApiError, type ApiError } from "./error";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15_000,
});

export function subscribeApiErrors(
  onError: (error: ApiError) => void,
): () => void {
  const id = api.interceptors.response.use(undefined, (error: unknown) => {
    onError(normalizeApiError(error));
    return Promise.reject(error);
  });
  return () => api.interceptors.response.eject(id);
}

// Set by the auth feature: gets a fresh access token, resolves false when it can't.
let refreshAccess: (() => Promise<boolean>) | null = null;
export function setAccessRefresher(refresher: () => Promise<boolean>) {
  refreshAccess = refresher;
}

// Registered first so it sees the raw axios error: an expired access token is
// refreshed once and the request replayed before anyone is told about a 401.
api.interceptors.response.use(undefined, async (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    const config = error.config as
      (InternalAxiosRequestConfig & { retried?: boolean }) | undefined;
    if (config && !config.retried && refreshAccess && (await refreshAccess())) {
      config.retried = true;
      return api.request(config);
    }
  }
  return Promise.reject(normalizeApiError(error));
});
