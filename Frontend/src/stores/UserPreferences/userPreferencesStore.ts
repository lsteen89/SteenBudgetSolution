import type { AppLocale } from "@/types/i18n/appLocale";
import type { CurrencyCode } from "@/types/i18n/currency";
import { create } from "zustand";

type UserPreferencesState = {
  locale: AppLocale;
  currency: CurrencyCode;
  initialized: boolean;
  setPreferences: (payload: {
    locale: AppLocale;
    currency: CurrencyCode;
  }) => void;
  reset: () => void;
};

export const useUserPreferencesStore = create<UserPreferencesState>((set) => ({
  locale: "sv-SE",
  currency: "EUR",
  initialized: false,

  setPreferences: ({ locale, currency }) =>
    set({
      locale,
      currency,
      initialized: true,
    }),

  reset: () =>
    set({
      locale: "sv-SE",
      currency: "SEK",
      initialized: false,
    }),
}));
