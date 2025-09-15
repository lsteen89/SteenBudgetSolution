import { isAxiosError } from 'axios';
import type { ApiErrorResponse } from '@/api/types';

export function getApiErrorMessage(err: unknown, fallback = 'Request failed'): string {
    if (isAxiosError<ApiErrorResponse>(err)) {
        return err.response?.data?.message ?? fallback;
    }
    return fallback;
}
