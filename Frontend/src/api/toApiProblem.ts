import type { ApiEnvelope, ApiProblem } from "@/api/api.types";
import type { AxiosError } from "axios";
import { isAxiosError } from "axios";

function parseRetryAfter(headerValue: unknown): number | undefined {
  const s = String(headerValue ?? "").trim();
  if (!s) return undefined;

  // seconds
  const asInt = Number(s);
  if (Number.isFinite(asInt) && asInt > 0) return Math.floor(asInt);

  // HTTP date
  const ms = Date.parse(s);
  if (!Number.isNaN(ms)) {
    const diffSec = Math.ceil((ms - Date.now()) / 1000);
    return diffSec > 0 ? diffSec : undefined;
  }

  return undefined;
}

export function toApiProblem(e: unknown): ApiProblem {
  if (!isAxiosError<ApiEnvelope<unknown>>(e)) {
    return {
      message: "Unable to connect to the server. Please try again.",
      isNetworkError: true,
      raw: e,
    };
  }

  const ax = e as AxiosError<ApiEnvelope<unknown>>;
  const status = ax.response?.status;

  const env = ax.response?.data;
  const message =
    env?.error?.message ??
    (status ? `Request failed (${status}).` : ax.message) ??
    "Request failed.";

  const retryAfterSeconds = parseRetryAfter(
    ax.response?.headers?.["retry-after"],
  );

  return {
    message,
    code: env?.error?.code,
    status,
    retryAfter: retryAfterSeconds ? String(retryAfterSeconds) : undefined, // keep your type stable
    isNetworkError: !ax.response,
    raw: e,
  };
}
