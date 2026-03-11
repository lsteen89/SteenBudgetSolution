import { getAppLocale } from "@/utils/i18n/locale";

export type RegistrationFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  repeatEmail: string;
  password: string;
  repeatPassword: string;
  humanToken: string;
  honeypot: string;
};

export type AppLocale = "sv-SE" | "en-US" | "et-EE";

export type RegistrationRequest = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  humanToken: string;
  honeypot: string;
  locale: AppLocale;
};

export const toRegistrationRequest = (
  v: RegistrationFormValues,
): RegistrationRequest => ({
  firstName: v.firstName.trim(),
  lastName: v.lastName.trim(),
  email: v.email.trim(),
  password: v.password,
  humanToken: v.humanToken,
  honeypot: v.honeypot ?? "",
  locale: getAppLocale(),
});
