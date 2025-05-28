import { api, refreshInFlight } from '@api/axios';
import { isAxiosError } from 'axios';
import { useAuthStore } from '@/stores/Auth/authStore';
import { UserLoginDto } from '@/types/User/Auth/userLoginForm';
import { LoginRes } from '@/types/User/Auth/authTypes';


let logoutOnce: Promise<void> | null = null;
let isLoggingOut = false;

/* ───── silent refresh ───── */
export async function refreshToken(): Promise<string> {
  const { setAuth } = useAuthStore.getState();

  const { data } = await api.post('/api/auth/refresh',
    { sessionId: useAuthStore.getState().sessionId,
      accessToken: useAuthStore.getState().accessToken },
    { headers: { 'X-Session-Id': useAuthStore.getState().sessionId ?? '' } });

  if (!data.success  || !data.accessToken)
      throw new Error('refresh failed');        // bubbles up

  setAuth(data.accessToken, data.sessionId, data.persoid, data.wsMac);
  api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
  return data.accessToken;
}

/* ───── interactive login ───── */
export async function callLogin(dto: UserLoginDto): Promise<LoginRes> {
  try {
    const { data } = await api.post<LoginRes>('/api/auth/login', dto);
    if (data.success) {
      const { accessToken, sessionId, persoid, wsMac } = data;
      useAuthStore.getState().setAuth(accessToken, sessionId, persoid, wsMac);
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    }
    return data;
  } catch (err) {
    const message = isAxiosError(err)
      ? err.response?.data?.message ?? 'Login misslyckades'
      : 'Nätverksfel';
    return { success: false, message };
  }
}


/* ───── logout ───── */
export async function callLogout(): Promise<void> {
  if (isLoggingOut) return logoutOnce ?? Promise.resolve();
  isLoggingOut = true;

  if (!logoutOnce) {
    const tok = useAuthStore.getState().accessToken;         // NEW
    logoutOnce = api.post(
      '/api/auth/logout',
      {},
      tok ? { headers: { Authorization: `Bearer ${tok}` } }  // NEW
          : undefined
    )
      .then(() => {}) // ensure Promise<void>
      .catch(() => {})   // swallow 4xx/5xx
      .finally(() => {
        useAuthStore.getState().clear();
        delete api.defaults.headers.common.Authorization;
        isLoggingOut = false;
        logoutOnce   = null;
        location.href = '/login';
      });
  }
  return logoutOnce;
}

export { isLoggingOut };                               
