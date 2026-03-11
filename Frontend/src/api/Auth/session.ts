import type { AuthResult } from "@/api/auth.types";
import { api } from "@/api/axios";
import { useAuthStore } from "@/stores/Auth/authStore";

export function applySession(auth: AuthResult) {
  useAuthStore
    .getState()
    .setAuth(
      auth.accessToken,
      auth.sessionId,
      auth.persoId,
      auth.wsMac ?? null,
      auth.rememberMe ?? false,
    );
  api.defaults.headers.common.Authorization = `Bearer ${auth.accessToken}`;
}
