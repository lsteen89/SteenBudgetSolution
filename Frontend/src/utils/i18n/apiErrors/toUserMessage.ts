import type { ApiProblem } from "@/api/api.types";
import type { AppLocale } from "@/utils/i18n/locale";
import { asAuthErrorCode, labelAuthError } from "./authErrors";

const isDev = import.meta.env.MODE !== "production";

export function toUserMessage(p: ApiProblem, locale: AppLocale): string {
  // Network / CORS / DNS / server down
  if (p.isNetworkError) {
    return locale === "sv-SE"
      ? "Kunde inte nå servern. Kontrollera anslutningen och försök igen."
      : "Could not reach the server. Check your connection and try again.";
  }

  // Rate limit
  if (p.status === 429) {
    const retryAfter =
      p.retryAfter ?? (locale === "sv-SE" ? "en stund" : "a moment");
    return locale === "sv-SE"
      ? `För många försök. Vänta ${retryAfter} och försök igen.`
      : `Too many attempts. Wait ${retryAfter} and try again.`;
  }

  // Server errors: keep generic
  if ((p.status ?? 0) >= 500) {
    return locale === "sv-SE"
      ? "Serverfel. Försök igen om en stund."
      : "Server error. Please try again in a moment.";
  }

  const code = asAuthErrorCode(p.code);
  const mapped = labelAuthError(code, locale);

  // Only show BE message in dev *when unknown*
  if (code === "Unknown" && isDev && p.message) return p.message;

  return mapped;
}
