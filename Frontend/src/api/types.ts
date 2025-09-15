// /src/api/types.ts
export type ApiResponse<T> = { data: T };
export type ApiErrorResponse = { errorCode: string; message: string };

// what BE returns for auth flows (adjust to your real shape)
export type AuthResult = {
    accessToken: string;
    sessionId: string;
    persoId: string;
    wsMac?: string;
    rememberMe: boolean;
};
