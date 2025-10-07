// /src/api/api.types.ts

/**
 * The generic shape of a successful API response envelope.
 * The actual data is in the `data` property.
 */
export type ApiResponse<T> = {
    data: T;
    isSuccess: boolean;
    error: null;
};

/**
 * The shape of a failed API response envelope.
 */
export type ApiErrorResponse = {
    data: null;
    isSuccess: boolean;
    error: {
        code: string;
        message: string;
    };
};