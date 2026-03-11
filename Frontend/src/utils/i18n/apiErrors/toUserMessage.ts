import type { ApiProblem } from "@/api/api.types";
import { apiErrorsDict } from "@/utils/i18n/apiErrors/apiErrors.i18n";
import type { AppLocale } from "@/utils/i18n/locale";
import { tDict } from "@/utils/i18n/translate";
import { asAuthErrorCode, labelAuthError } from "./authErrors";

const isDev = import.meta.env.MODE !== "production";

function format(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

export function toUserMessage(p: ApiProblem, locale: AppLocale): string {
  const t = <K extends keyof typeof apiErrorsDict.sv>(k: K) =>
    tDict(k, locale, apiErrorsDict);

  // Network / CORS / DNS / server down
  if (p.isNetworkError) {
    return t("network");
  }

  // Rate limit
  if (p.status === 429) {
    const retryAfter = p.retryAfter ?? t("rateLimitFallback");
    return format(t("rateLimit"), { retryAfter });
  }

  // Server errors: keep generic
  if ((p.status ?? 0) >= 500) {
    return t("server");
  }

  const code = asAuthErrorCode(p.code);
  const mapped = labelAuthError(code, locale);

  // Only show BE message in dev *when unknown*
  if (code === "Unknown" && isDev && p.message) return p.message;

  return mapped;
}
