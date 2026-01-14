import { AxiosError } from "axios";

export function logAxiosError(label: string, e: unknown) {
    const err = e as AxiosError<any>;
    console.error(label, {
        message: err.message,
        url: err.config?.url,
        method: err.config?.method,
        status: err.response?.status,
        data: err.response?.data,
    });
}