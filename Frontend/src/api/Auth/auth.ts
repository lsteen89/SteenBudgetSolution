import { api } from '@/api/axios';
import { isAxiosError } from 'axios';
import { useAuthStore } from '@/stores/Auth/authStore';
import type { AuthResult, ApiErrorResponse } from '@/api/types';

let logoutOnce: Promise<void> | null = null;
let isLoggingOutFlag = false;

// ✅ export the *binding* so updates are visible to importers
export { isLoggingOutFlag as isLoggingOut };

/* ───── silent refresh (NO BODY) ───── */
export async function refreshToken(): Promise<string> {
  const { setAuth } = useAuthStore.getState();

  const { data: payload } = await api.post<AuthResult>('/api/auth/refresh'); // no body
  if (!payload?.accessToken) throw new Error('refresh failed: no access token');

  // ✅ coalesce wsMac to null (setAuth likely expects string|null)
  setAuth(
    payload.accessToken,
    payload.sessionId,
    payload.persoId,
    payload.wsMac ?? null,
    payload.rememberMe ?? false
  );

  api.defaults.headers.common.Authorization = `Bearer ${payload.accessToken}`;
  return payload.accessToken;
}

/* ───── interactive login ───── */
export type LoginRes =
  | { success: true; data: AuthResult }
  | { success: false; message: string; errorCode?: string; status?: number };

export async function callLogin(
  dto: { email: string; password: string; captchaToken?: string; rememberMe?: boolean }
): Promise<LoginRes> {
  try {
    const { data: payload } = await api.post<AuthResult>('/api/auth/login', dto);

    // Optionally set store here:
    const { setAuth } = useAuthStore.getState();
    setAuth(
      payload.accessToken,
      payload.sessionId,
      payload.persoId,
      payload.wsMac ?? null,
      payload.rememberMe ?? false
    );
    api.defaults.headers.common.Authorization = `Bearer ${payload.accessToken}`;

    return { success: true, data: payload };
  } catch (err) {
    if (isAxiosError<ApiErrorResponse>(err)) {
      const message = err.response?.data?.message ?? 'Login failed';
      const errorCode = err.response?.data?.errorCode;
      return { success: false, message, errorCode, status: err.response?.status };
    }
    return { success: false, message: 'Network error' };
  }
}

/* ───── logout ───── */
export async function callLogout(): Promise<void> {
  if (isLoggingOutFlag) return logoutOnce ?? Promise.resolve();
  isLoggingOutFlag = true;

  if (!logoutOnce) {
    const tok = useAuthStore.getState().accessToken;

    // ✅ force Promise<void> with .then(() => undefined).catch(() => undefined)
    logoutOnce = api
      .post('/api/auth/logout', {}, tok ? { headers: { Authorization: `Bearer ${tok}` } } : undefined)
      .then(() => undefined)  // ← make the chain Promise<void>
      .catch(() => undefined) // ← swallow and keep Promise<void>
      .finally(() => {
        useAuthStore.getState().clear();
        delete api.defaults.headers.common.Authorization;
        isLoggingOutFlag = false;
        logoutOnce = null; // safe after we've already returned the promise
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      });
  }

  // ✅ always return a Promise<void>
  return logoutOnce!;
}
