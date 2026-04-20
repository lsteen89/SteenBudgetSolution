import type { AppLocale } from "@/types/i18n/appLocale";
import type { CurrencyCode } from "@/types/i18n/currency";

export const INCOME_PAYMENT_DAY_TYPES = [
  "dayOfMonth",
  "lastDayOfMonth",
] as const;

export type IncomePaymentDayType = (typeof INCOME_PAYMENT_DAY_TYPES)[number];

export type SettingsFormValues = {
  firstName: string;
  lastName: string;
  locale: AppLocale;
  currency: CurrencyCode;
};

export type BudgetSettingsFormValues = {
  incomePaymentDayType: IncomePaymentDayType;
  incomePaymentDay: number | null;
  updateCurrentAndFuture: boolean;
};
