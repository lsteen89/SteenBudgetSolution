import type { AppLocale } from "@/types/i18n/appLocale";
import type { CurrencyCode } from "@/types/i18n/currency";
import { create } from "zustand";

type UserPreferencesState = {
  locale: AppLocale;
  currency: CurrencyCode;
  budgetPeriodCloseDay: number | null;
  initialized: boolean;
  setPreferences: (payload: {
    locale: AppLocale;
    currency: CurrencyCode;
    budgetPeriodCloseDay?: number | null;
  }) => void;
  reset: () => void;
};

export const useUserPreferencesStore = create<UserPreferencesState>((set) => ({
  locale: "sv-SE",
  currency: "SEK",
  budgetPeriodCloseDay: null,
  initialized: false,

  setPreferences: ({ locale, currency, budgetPeriodCloseDay = null }) =>
    set({
      locale,
      currency,
      budgetPeriodCloseDay,
      initialized: true,
    }),

  reset: () =>
    set({
      locale: "sv-SE",
      currency: "SEK",
      budgetPeriodCloseDay: null,
      initialized: false,
    }),
}));
