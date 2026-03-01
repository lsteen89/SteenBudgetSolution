import type { ApiEnvelope, ApiProblem } from "@/api/api.types";
import type { AxiosError } from "axios";
import { isAxiosError } from "axios";
console.log("[toApiProblem] module loaded");
function isApiProblem(x: unknown): x is ApiProblem {
  if (!x || typeof x !== "object") return false;
  const o = x as any;

  return typeof o.message === "string" && typeof o.isNetworkError === "boolean";
}

function parseRetryAfter(headerValue: unknown): string | undefined {
  const s = String(headerValue ?? "").trim();
  if (!s) return undefined;

  const asInt = Number(s);
  if (Number.isFinite(asInt) && asInt > 0) return String(Math.floor(asInt));

  const ms = Date.parse(s);
  if (!Number.isNaN(ms)) {
    const diffSec = Math.ceil((ms - Date.now()) / 1000);
    return diffSec > 0 ? String(diffSec) : undefined;
  }

  return undefined;
}

export function toApiProblem(e: unknown): ApiProblem {
  console.log("[toApiProblem] called with", e);
  if (isApiProblem(e)) return e;

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

  return {
    message:
      env?.error?.message ??
      (status ? `Request failed (${status}).` : ax.message) ??
      "Request failed.",
    code: env?.error?.code,
    status,
    retryAfter: parseRetryAfter(ax.response?.headers?.["retry-after"]),
    isNetworkError: !ax.response,
    raw: {
      message: ax.message,
      url: ax.config?.url,
      method: ax.config?.method,
      status,
      data: env,
    },
  };
}
