import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosRequestHeaders,
} from 'axios';
import { useAuthStore } from '@/stores/Auth/authStore';
import { refreshToken, callLogout, isLoggingOut } from '@/api/Auth/auth';

/* ───────── helpers ───────── */

// make sure we always work with AxiosHeaders
function ensureAxiosHeaders(h?: AxiosRequestHeaders): AxiosHeaders {
  return h instanceof AxiosHeaders ? h : new AxiosHeaders(h ?? undefined);
}

const baseURL = import.meta.env.VITE_APP_API_URL;

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

/* ───────── SINGLE REFRESH PROMISE ───────── */
export let refreshInFlight: Promise<string> | null = null;
let refreshDoneAt = 0;

export async function queueRefresh(force = false) {
  const now = Date.now();
  if (!force && now - refreshDoneAt < 5000 && refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight ??= refreshToken().finally(() => {
    refreshDoneAt = Date.now();
    refreshInFlight = null;
  });

  return refreshInFlight;
}

const isAuthRoute = (url?: string) => !!url && /\/api\/auth(\/|$)/.test(url);

/* request */
api.interceptors.request.use((cfg) => {
  const tok = useAuthStore.getState().accessToken;
  if (tok) {
    const h = ensureAxiosHeaders(cfg.headers);
    h.set('Authorization', `Bearer ${tok}`);
    cfg.headers = h;
  }
  return cfg;
});

/* response */
api.interceptors.response.use(
  (res) => {
    // ✅ Do NOT auto-unbox ApiEnvelope<any> anymore.
    // 204s are fine as-is; others return the raw envelope in res.data.
    return res;
  },
  async (err: AxiosError) => {
    if (isLoggingOut) throw err;

    const status = err.response?.status;
    const url = err.config?.url;
    const alreadyRetried = (err.config as any)?._retry;

    // Never attempt refresh for any /api/auth/* endpoint
    if (status === 401 && !isAuthRoute(url) && !alreadyRetried) {
      try {
        (err.config as any)._retry = true;
        const tok = await queueRefresh();

        const h = ensureAxiosHeaders(err.config!.headers);
        h.set('Authorization', `Bearer ${tok}`);
        err.config!.headers = h;

        return api(err.config!); // replay once
      } catch {
        await callLogout(); // refresh failed → hard logout
      }
    }

    // Just propagate the error; call sites know about ApiEnvelope now.
    return Promise.reject(err);
  }
);
