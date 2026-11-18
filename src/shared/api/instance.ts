import axios from "axios";
import { normalizeApiError, type ApiError } from "./error";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
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

api.interceptors.response.use(undefined, (error: unknown) =>
  Promise.reject(normalizeApiError(error)),
);
