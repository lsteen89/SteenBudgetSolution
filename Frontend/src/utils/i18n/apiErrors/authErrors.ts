import type { AppLocale } from "@/utils/i18n/locale";

export type AuthErrorCode =
  | "Verification.EmailNotConfirmed"
  | "Auth.InvalidChallengeToken"
  | "Auth.ChallengeServiceUnavailable"
  | "Auth.HumanVerificationRequired"
  | "Registration.EmailAlreadyExists"
  | "Registration.Failed"
  | "Registration.InvalidData"
  | "Registration.HoneypotDetected"
  | "Registration.InvalidVerificationCode"
  | "Registration.VerificationLocked"
  | "Registration.VerificationExpired"
  // legacy aliases (keep while migrating)
  | "User.EmailAlreadyExists"
  | "RateLimit.Exceeded"
  | "RateLimit.TooManyRequests"
  | "User.ValidationFailed"
  | "Validation.Failed"
  | "Unknown";

export const sv = {
  "Verification.EmailNotConfirmed": "Din e-postadress är inte bekräftad.",
  "Auth.InvalidChallengeToken": "Verifieringen misslyckades. Försök igen.",
  "Auth.ChallengeServiceUnavailable":
    "Verifiering är tillfälligt otillgänglig. Försök snart igen.",
  "Auth.HumanVerificationRequired": "Verifieringen misslyckades. Försök igen.",
  "Registration.EmailAlreadyExists": "E-posten finns redan.",
  "Registration.Failed": "Något gick fel. Försök igen.",
  "Registration.InvalidData": "Kontrollera formuläret och försök igen.",
  "Registration.HoneypotDetected": "Något gick fel. Försök igen.",
  "Registration.InvalidVerificationCode": "Fel kod. Försök igen.",
  "Registration.VerificationLocked":
    "För många försök. Vänta lite och försök igen.",
  "Registration.VerificationExpired": "Koden har gått ut. Be om en ny kod.",

  // legacy
  "User.EmailAlreadyExists": "E-posten finns redan.",
  "RateLimit.Exceeded": "För många försök. Vänta en stund och försök igen.",
  "RateLimit.TooManyRequests":
    "För många försök. Vänta en stund och försök igen.",
  "User.ValidationFailed": "Kontrollera formuläret och försök igen.",
  "Validation.Failed": "Kontrollera formuläret och försök igen.",

  Unknown: "Något gick fel. Försök igen.",
} satisfies Record<AuthErrorCode, string>;

export const en = {
  "Verification.EmailNotConfirmed": "Your email address is not confirmed.",
  "Auth.InvalidChallengeToken": "Verification failed. Please try again.",
  "Auth.ChallengeServiceUnavailable":
    "Verification is temporarily unavailable. Please try again soon.",
  "Auth.HumanVerificationRequired": "Verification failed. Please try again.",

  "Registration.EmailAlreadyExists": "Email already exists.",
  "Registration.Failed": "Something went wrong. Please try again.",
  "Registration.InvalidData": "Please check the form and try again.",
  "Registration.HoneypotDetected": "Something went wrong. Please try again.",
  "Registration.InvalidVerificationCode": "Invalid code. Please try again.",
  "Registration.VerificationLocked":
    "Too many attempts. Please try again later.",
  "Registration.VerificationExpired":
    "The code has expired. Please request a new code.",

  // legacy
  "User.EmailAlreadyExists": "Email already exists.",
  "RateLimit.Exceeded": "Too many attempts. Please try again later.",
  "RateLimit.TooManyRequests": "Too many attempts. Please try again later.",
  "User.ValidationFailed": "Please check the form and try again.",
  "Validation.Failed": "Please check the form and try again.",

  Unknown: "Something went wrong. Please try again.",
} satisfies Record<AuthErrorCode, string>;

const KNOWN: readonly AuthErrorCode[] = Object.keys(sv) as AuthErrorCode[];

export function asAuthErrorCode(raw: unknown): AuthErrorCode {
  const s = String(raw ?? "").trim();
  return (KNOWN as readonly string[]).includes(s)
    ? (s as AuthErrorCode)
    : "Unknown";
}

export function labelAuthError(code: AuthErrorCode, locale: AppLocale) {
  return (locale === "sv-SE" ? sv : en)[code];
}
