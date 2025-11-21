import { api } from '@/api/axios';
import { isAxiosError } from 'axios';
import { useAuthStore } from '@/stores/Auth/authStore';
import type { AuthResult } from '@/api/auth.types.ts'
import type { ApiEnvelope } from '@/api/api.types';

let logoutOnce: Promise<void> | null = null;
let isLoggingOutFlag = false;

export { isLoggingOutFlag as isLoggingOut };

/* ───── silent refresh (NO BODY) ───── */
export async function refreshToken(): Promise<string> {
  const { setAuth } = useAuthStore.getState();

  const { data: envelope } = await api.post<ApiEnvelope<AuthResult>>('/api/auth/refresh');

  if (!envelope.isSuccess || !envelope.data) {
    // you can inspect envelope.error here if you want more nuance
    throw new Error(envelope.error?.code ?? 'refresh failed');
  }

  const payload = envelope.data;

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
    // BE returns ApiEnvelope<AuthResult>
    const { data: envelope } = await api.post<ApiEnvelope<AuthResult>>('/api/auth/login', dto);

    // Case: HTTP 200 but business failure is inside envelope
    if (!envelope.isSuccess || !envelope.data || envelope.error) {
      return {
        success: false,
        message: envelope.error?.message ?? 'Login failed',
        errorCode: envelope.error?.code,
        status: 200,
      };
    }

    const payload = envelope.data;

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
    // Case: 4xx/5xx + envelope body
    if (isAxiosError<ApiEnvelope<unknown>>(err)) {
      const env = err.response?.data;

      return {
        success: false,
        message: env?.error?.message ?? 'Login failed',
        errorCode: env?.error?.code,
        status: err.response?.status,
      };
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

    logoutOnce = api

      .post('/api/auth/logout', {}, tok ? { headers: { Authorization: `Bearer ${tok}` } } : undefined)
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        useAuthStore.getState().clear();
        delete api.defaults.headers.common.Authorization;
        isLoggingOutFlag = false;
        logoutOnce = null;
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      });
  }

  return logoutOnce!;
}