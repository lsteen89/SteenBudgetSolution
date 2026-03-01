import type { ApiEnvelope, ApiProblem } from "@/api/api.types";
import type { AxiosResponse } from "axios";

export function envelopeToProblem<T>(
  env: ApiEnvelope<T> | undefined,
  status: number | undefined,
  fallbackMessage: string,
  raw?: unknown,
): ApiProblem {
  return {
    message: env?.error?.message ?? fallbackMessage,
    code: env?.error?.code ?? "Unknown",
    status,
    isNetworkError: false,
    raw: raw ?? env,
  };
}

export function unwrapEnvelope<T>(
  res: AxiosResponse<ApiEnvelope<T>>,
  fallbackMessage: string,
): T {
  const env = res.data;
  if (!env?.isSuccess || env.error) {
    throw envelopeToProblem(env, res.status, fallbackMessage, res);
  }
  return env.data as T;
}
