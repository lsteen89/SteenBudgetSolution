export type ApiErrorEnvelope = {
    code: string;
    message: string;
};

export type ApiEnvelope<T> = {
    data: T | null;
    isSuccess: boolean;
    error: ApiErrorEnvelope | null;
};