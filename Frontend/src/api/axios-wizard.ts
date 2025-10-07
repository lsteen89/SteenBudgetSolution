import axios, { AxiosError, AxiosHeaders, type AxiosRequestHeaders, AxiosResponse } from 'axios';
import { useAuthStore } from '@/stores/Auth/authStore';

// reuse helpers from your axios.ts (or copy minimal ones)
const baseURL = import.meta.env.VITE_APP_API_URL;

const ensureAxiosHeaders = (h?: AxiosRequestHeaders) =>
    h instanceof AxiosHeaders ? h : new AxiosHeaders(h ?? undefined);

// Narrow checker for your envelope
const isWizardEnvelope = (x: any): x is { isSuccess: boolean; data?: any; error?: { code: string; message: string } } =>
    !!x && typeof x === 'object' && 'isSuccess' in x && 'data' in x && 'error' in x;

export const apiWizard = axios.create({
    baseURL,            // same base URL
    withCredentials: true,
});

// auth header (same as global)
apiWizard.interceptors.request.use(cfg => {
    const tok = useAuthStore.getState().accessToken;
    if (tok) {
        const h = ensureAxiosHeaders(cfg.headers);
        h.set('Authorization', `Bearer ${tok}`);
        cfg.headers = h;
    }
    return cfg;
});

// unwrap ONLY for wizard calls
apiWizard.interceptors.response.use(
    (res: AxiosResponse) => {
        if (res.status === 204) return res;
        const body = res.data;
        if (isWizardEnvelope(body)) {
            if (body.isSuccess) {
                (res as any).data = body.data; // unwrap
                return res;
            }
            // Normalize API-level failure that returned 200
            const { code = 'Wizard.Unknown', message = 'Wizard request failed.' } = body.error ?? {};
            const err = new AxiosError(message, undefined, res.config, res.request, res);
            (err as any).errorCode = code;
            return Promise.reject(err);
        }
        return res; // passthrough if BE returns raw here
    },
    (err: AxiosError<any>) => {
        // For non-2xx errors, if envelope exists normalize message/code
        const env = err.response?.data;
        if (isWizardEnvelope(env) && env.isSuccess === false && env.error) {
            err.message = env.error.message ?? err.message;
            (err as any).errorCode = env.error.code ?? 'Wizard.Unknown';
        }
        return Promise.reject(err);
    }
);
