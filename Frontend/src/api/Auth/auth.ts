import type { ApiEnvelope } from "@/api/api.types";
import type { AuthResult } from "@/api/auth.types.ts";
import { api } from "@/api/axios";
import { unwrapEnvelopeData } from "@/api/envelope";
import { toApiProblem } from "@/api/toApiProblem";
import { useAuthStore } from "@/stores/Auth/authStore";
import { isAxiosError } from "axios";

type LogoutMode = "user" | "silent";

let logoutOnce: Promise<void> | null = null;
let isLoggingOutFlag = false;
export { isLoggingOutFlag as isLoggingOut };

/* ───── silent refresh (NO BODY) ───── */
export async function refreshToken(): Promise<AuthResult> {
  try {
    const res = await api.post<ApiEnvelope<AuthResult>>("/api/auth/refresh");
    return unwrapEnvelopeData(res, "Refresh failed.");
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
    return unwrapEnvelopeData(res, "Login failed.");
  } catch (e) {
    if (isAxiosError(e)) throw toApiProblem(e);
    throw e;
  }
}

/* ───── logout ───── */
export async function callLogout(mode: LogoutMode = "user"): Promise<void> {
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

        if (mode === "user" && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      });
  }

  return logoutOnce!;
}
