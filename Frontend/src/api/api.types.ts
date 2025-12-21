export type ApiErrorDto = {
    code: string;
    message: string;
};

export type ApiEnvelope<T> = {
    data: T | null;
    isSuccess: boolean;
    error: ApiErrorDto | null;
};

// Normalized FE error used everywhere (stores + UI)
export type ApiProblem = {
    message: string;
    code?: string;        // backend error code when present
    status?: number;      // HTTP status when present
    isNetworkError?: boolean;
    raw?: unknown;        // optional: keep for debugging/logging
};