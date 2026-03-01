import type { ApiEnvelope } from "@/api/api.types";
import type { AuthResult } from "@/api/auth.types.ts";
import { api } from "@/api/axios";
import { unwrapEnvelope } from "@/api/envelope";
import { toApiProblem } from "@/api/toApiProblem";
import { useAuthStore } from "@/stores/Auth/authStore";
import { isAxiosError } from "axios";

let logoutOnce: Promise<void> | null = null;
let isLoggingOutFlag = false;
export { isLoggingOutFlag as isLoggingOut };

/* ───── silent refresh (NO BODY) ───── */
export async function refreshToken(): Promise<string> {
  const { setAuth } = useAuthStore.getState();

  try {
    const res = await api.post<ApiEnvelope<AuthResult>>("/api/auth/refresh");
    const payload = unwrapEnvelope(res, "Refresh failed.");

    setAuth(
      payload.accessToken,
      payload.sessionId,
      payload.persoId,
      payload.wsMac ?? null,
      payload.rememberMe ?? false,
    );

    api.defaults.headers.common.Authorization = `Bearer ${payload.accessToken}`;
    return payload.accessToken;
  } catch (e) {
    if (isAxiosError(e)) throw toApiProblem(e);
    throw e;
  }
}

/* ───── interactive login ───── */
export async function callLogin(dto: {
  email: string;
  password: string;
  HumanToken?: string | null;
  rememberMe?: boolean;
}): Promise<AuthResult> {
  try {
    const res = await api.post<ApiEnvelope<AuthResult>>("/api/auth/login", dto);

    // Handles both: 200+error-envelope and normal success
    const payload = unwrapEnvelope(res, "Login failed.");

    const { setAuth } = useAuthStore.getState();
    setAuth(
      payload.accessToken,
      payload.sessionId,
      payload.persoId,
      payload.wsMac ?? null,
      payload.rememberMe ?? false,
    );

    api.defaults.headers.common.Authorization = `Bearer ${payload.accessToken}`;
    return payload;
  } catch (e) {
    if (isAxiosError(e)) throw toApiProblem(e);
    throw e;
  }
}

/* ───── logout ───── */
export async function callLogout(): Promise<void> {
  if (isLoggingOutFlag) return logoutOnce ?? Promise.resolve();
  isLoggingOutFlag = true;

  if (!logoutOnce) {
    const tok = useAuthStore.getState().accessToken;

    logoutOnce = api
      .post(
        "/api/auth/logout",
        {},
        tok ? { headers: { Authorization: `Bearer ${tok}` } } : undefined,
      )
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        useAuthStore.getState().clear();
        delete api.defaults.headers.common.Authorization;
        isLoggingOutFlag = false;
        logoutOnce = null;
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      });
  }

  return logoutOnce!;
}
