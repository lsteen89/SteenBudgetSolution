import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosRequestHeaders,
  type RawAxiosResponseHeaders,
} from 'axios';
import { useAuthStore } from '@/stores/Auth/authStore';
import { refreshToken, callLogout, isLoggingOut } from '@/api/Auth/auth';

/* ───────── helpers ───────── */

// make sure we always work with AxiosHeaders
function ensureAxiosHeaders(h?: AxiosRequestHeaders): AxiosHeaders {
  return h instanceof AxiosHeaders ? h : new AxiosHeaders(h ?? undefined);
}

// robust duck-typing (avoids edge cases with duplicate axios copies)
function isAxiosHeaders(h: any): h is AxiosHeaders {
  return !!h && typeof h.get === 'function' && typeof h.set === 'function';
}

// normalize any header value to string
function headerValToString(v: unknown): string {
  if (v == null) return '';
  return Array.isArray(v) ? String(v[0] ?? '') : String(v);
}

// headers utils for JSON check (works for AxiosHeaders and plain objects)
function getContentType(
  headers?: RawAxiosResponseHeaders | AxiosHeaders
): string {
  if (!headers) return '';

  // AxiosHeaders path
  if (isAxiosHeaders(headers)) {
    return headerValToString(headers.get('content-type'));
  }

  // Raw object path; handle lower/upper casing
  const raw =
    (headers['content-type'] as unknown) ??
    (headers as Record<string, unknown>)['Content-Type'];

  return headerValToString(raw);
}

// be tolerant: match any "*json*"
const isJson = (headers?: RawAxiosResponseHeaders | AxiosHeaders) =>
  getContentType(headers).toLowerCase().includes('json');

const baseURL = import.meta.env.VITE_API_URL ?? window.location.origin;
export const api = axios.create({
  baseURL,
  withCredentials: true,
});

/* ───────── SINGLE REFRESH PROMISE ───────── */
export let refreshInFlight: Promise<string> | null = null;
let refreshDoneAt = 0;
export async function queueRefresh(force = false) {
  const now = Date.now();
  if (!force && now - refreshDoneAt < 5000 && refreshInFlight) return refreshInFlight;

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
    cfg.headers = h; // ✅ correct type
  }
  return cfg;
});

/* response */
api.interceptors.response.use(
  (res) => {
    if (res.status === 204) return res;
    if (isJson(res.headers) && res.data && 'data' in res.data) {
      res.data = res.data.data; // unwrap envelope
    }
    return res;
  },
  async (err: AxiosError<{ errorCode: string; message: string }>) => {
    if (isLoggingOut) throw err;

    const status = err.response?.status;
    const url = err.config?.url;
    const alreadyRetried = err.config?._retry;

    // Never attempt refresh for any /api/auth/* endpoint
    if (status === 401 && !isAuthRoute(url) && !alreadyRetried) {
      try {
        err.config!._retry = true;
        const tok = await queueRefresh();

        const h = ensureAxiosHeaders(err.config!.headers);
        h.set('Authorization', `Bearer ${tok}`);
        err.config!.headers = h; // ✅ no `{}` assignment
        return api(err.config!); // replay once
      } catch {
        await callLogout(); // refresh failed → hard logout
      }
    }

    // keep {errorCode, message} shape for JSON errors
    if (isJson(err.response?.headers) && err.response?.data) {
      return Promise.reject(err);
    }
    return Promise.reject(err);
  }
);
