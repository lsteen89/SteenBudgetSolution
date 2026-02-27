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
  code?: string;
  status?: number;
  retryAfter?: string;
  isNetworkError?: boolean;
  raw?: unknown;
};
