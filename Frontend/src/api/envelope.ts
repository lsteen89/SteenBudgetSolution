import type { ApiEnvelope, ApiInfoDto, ApiProblem } from "@/api/api.types";
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

export function unwrapEnvelopeResult<T>(
  res: AxiosResponse<ApiEnvelope<T>>,
  fallbackMessage: string,
): { data: T | null; info: ApiInfoDto | null } {
  const env = res.data;
  if (!env?.isSuccess || env.error) {
    throw envelopeToProblem(env, res.status, fallbackMessage, res);
  }

  return {
    data: env.data ?? null,
    info: env.info ?? null,
  };
}

export function unwrapEnvelopeData<T>(
  res: AxiosResponse<ApiEnvelope<T>>,
  fallbackMessage: string,
): T {
  const { data } = unwrapEnvelopeResult(res, fallbackMessage);

  if (data == null) {
    throw envelopeToProblem(undefined, res.status, fallbackMessage, res);
  }

  return data;
}

export function unwrapEnvelopeInfo<T>(
  res: AxiosResponse<ApiEnvelope<T>>,
  fallbackMessage: string,
): ApiInfoDto | null {
  return unwrapEnvelopeResult(res, fallbackMessage).info;
}

export function unwrapEnvelope<T>(
  res: AxiosResponse<ApiEnvelope<T>>,
  fallbackMessage: string,
): T {
  return unwrapEnvelopeData(res, fallbackMessage);
}
