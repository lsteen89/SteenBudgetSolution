import type { ApiInfoDto } from "@/api/api.types";
import type { AppLocale } from "@/types/i18n/appLocale";

const API_SUCCESS_CODES = [
  "Verification.ResendAccepted",
  "PasswordReset.RequestAccepted",
  "PasswordReset.Completed",
  "Support.MessageQueued",
  "Unknown",
] as const;

export type ApiSuccessCode = (typeof API_SUCCESS_CODES)[number];

const sv = {
  "Verification.ResendAccepted":
    "Om ett konto med den e-posten finns har en ny verifieringskod skickats.",
  "PasswordReset.RequestAccepted":
    "Om ett konto med den e-posten finns har instruktioner for aterstallning skickats.",
  "PasswordReset.Completed": "Ditt losenord har aterstallts.",
  "Support.MessageQueued": "Ditt supportmeddelande har skickats.",
  Unknown: "Klart.",
} satisfies Record<ApiSuccessCode, string>;

const en = {
  "Verification.ResendAccepted":
    "If an account with that email exists, a new verification code has been sent.",
  "PasswordReset.RequestAccepted":
    "If an account with that email exists, password reset instructions have been sent.",
  "PasswordReset.Completed": "Your password has been reset successfully.",
  "Support.MessageQueued": "Your support message has been sent.",
  Unknown: "Done.",
} satisfies Record<ApiSuccessCode, string>;

const et = {
  "Verification.ResendAccepted":
    "Kui selle e-postiga konto on olemas, saadeti uus kinnituskood.",
  "PasswordReset.RequestAccepted":
    "Kui selle e-postiga konto on olemas, saadeti parooli taastamise juhised.",
  "PasswordReset.Completed": "Sinu parool on edukalt taastatud.",
  "Support.MessageQueued": "Sinu tugisonum on saadetud.",
  Unknown: "Valmis.",
} satisfies Record<ApiSuccessCode, string>;

const KNOWN_API_SUCCESS_CODES = new Set<string>(API_SUCCESS_CODES);

export function asApiSuccessCode(raw: unknown): ApiSuccessCode {
  const code = String(raw ?? "").trim();
  return KNOWN_API_SUCCESS_CODES.has(code)
    ? (code as ApiSuccessCode)
    : "Unknown";
}

export function labelApiSuccess(code: ApiSuccessCode, locale: AppLocale) {
  const table = locale.startsWith("sv")
    ? sv
    : locale.startsWith("et")
      ? et
      : en;

  return table[code];
}

export function toUserSuccessMessage(
  info: ApiInfoDto | null | undefined,
  locale: AppLocale,
): string {
  if (!info) return labelApiSuccess("Unknown", locale);

  const code = asApiSuccessCode(info.code);
  return code === "Unknown" ? info.message : labelApiSuccess(code, locale);
}
