import type { AppLocale } from "@/types/i18n/appLocale";
import type { CurrencyCode } from "@/types/i18n/currency";

export type SettingsFormValues = {
  firstName: string;
  lastName: string;
  locale: AppLocale;
  currency: CurrencyCode;
};
