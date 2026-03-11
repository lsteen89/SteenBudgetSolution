import { callLogout, isLoggingOut, refreshToken } from "@/api/Auth/auth";
import { applySession } from "@/api/Auth/session";
import { useAuthStore } from "@/stores/Auth/authStore";
import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosRequestHeaders,
} from "axios";

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

export let refreshInFlight: Promise<string> | null = null;
let refreshDoneAt = 0;

/* ───────── SINGLE REFRESH PROMISE ───────── */
export function queueRefresh(force = false): Promise<string> {
  const now = Date.now();

  if (!force && refreshInFlight && now - refreshDoneAt < 5000) {
    return refreshInFlight;
  }

  refreshInFlight ??= refreshToken()
    .then((auth) => {
      applySession(auth);
      return auth.accessToken;
    })
    .finally(() => {
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
    h.set("Authorization", `Bearer ${tok}`);
    cfg.headers = h;
  }
  return cfg;
});

/* response */
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    if (isLoggingOut) throw err;

    const status = err.response?.status;
    const url = err.config?.url;
    const alreadyRetried = (err.config as any)?._retry;

    const hadToken = !!useAuthStore.getState().accessToken; // critical

    if (status === 401 && hadToken && !isAuthRoute(url) && !alreadyRetried) {
      try {
        (err.config as any)._retry = true;

        const tok = await queueRefresh(true); // force refresh here; safer
        const h = ensureAxiosHeaders(err.config!.headers);
        h.set("Authorization", `Bearer ${tok}`);
        err.config!.headers = h;

        return api(err.config!);
      } catch {
        const s = useAuthStore.getState();
        if (!s.authEvent || s.authEvent.type !== "session_expired") {
          s.setAuthEvent({ type: "session_expired", at: Date.now() });
        }
        await callLogout("silent");
      }
    }

    return Promise.reject(err);
  },
);
