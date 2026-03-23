import { useUserPreferencesStore } from "@/stores/UserPreferences/userPreferencesStore";
import { DEFAULT_CURRENCY, type CurrencyCode } from "@/types/i18n/currency";
import * as React from "react";

export function useAppCurrency(): CurrencyCode {
  const currency = useUserPreferencesStore((s) => s.currency);
  const initialized = useUserPreferencesStore((s) => s.initialized);

  return React.useMemo(
    () => (initialized ? currency : DEFAULT_CURRENCY),
    [initialized, currency],
  );
}
