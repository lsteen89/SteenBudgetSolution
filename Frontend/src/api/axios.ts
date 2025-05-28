import axios                from 'axios';
import { refreshToken, callLogout, isLoggingOut }     from '@/api/Auth/auth';
import { useAuthStore }     from '@/stores/Auth/authStore';

export const api = axios.create({
  baseURL        : import.meta.env.VITE_API_URL,
  withCredentials: true,
});

/* ───────── SINGLE REFRESH PROMISE ───────── */
export let refreshInFlight: Promise<string> | null = null;   // (exported)
let refreshDoneAt      = 0;                     // last time a refresh finished

export async function queueRefresh(force = false) {
  const now = Date.now();
  if (!force && now - refreshDoneAt < 5000 && refreshInFlight)
    return refreshInFlight;                

  refreshInFlight ??= refreshToken()
    .finally(() => {
      refreshDoneAt = Date.now();           // remember when it *really* ended
      refreshInFlight = null;
    });

  return refreshInFlight;
}


/* request- & response-interceptors */
api.interceptors.request.use(cfg => {
  const tok = useAuthStore.getState().accessToken;
  if (tok && cfg.headers) cfg.headers.Authorization = `Bearer ${tok}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  async err => {
    if (isLoggingOut) return Promise.reject(err);               // bail out

    const { status } = err.response ?? {};
    const url        = err.config.url ?? '';
    const isAuth     = /\/auth\/(refresh|logout)$/.test(url);

    if (status === 401 && !isAuth && !err.config._retry) {
      err.config._retry = true;
      try {
        const tok = await queueRefresh();
        err.config.headers!.Authorization = `Bearer ${tok}`;
        return api(err.config);               // replay once
      } catch {
        await callLogout();                   // refresh failed → logout
      }
    }
    return Promise.reject(err);
  }
);

