import { api } from "@/shared/api";
import { clearSession } from "@/entities/user";

export async function logout() {
  try {
    await api.post("/api/v1/auth/logout");
  } finally {
    clearSession();
  }
}
