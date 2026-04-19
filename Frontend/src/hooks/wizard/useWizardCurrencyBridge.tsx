import * as React from "react";

import { updatePreferences } from "@/api/Services/User/settings";
import { useUserPreferencesStore } from "@/stores/UserPreferences/userPreferencesStore";
import type { CurrencyCode } from "@/types/i18n/currency";

export function useWizardCurrencyBridge() {
  const storeCurrency = useUserPreferencesStore((s) => s.currency);
  const initialized = useUserPreferencesStore((s) => s.initialized);
  const setPreferences = useUserPreferencesStore((s) => s.setPreferences);

  const [currency, setCurrency] = React.useState<CurrencyCode>(storeCurrency);
  const [isPersistingPreferences, setIsPersistingPreferences] =
    React.useState(false);

  React.useEffect(() => {
    if (!initialized) return;
    setCurrency(storeCurrency);
  }, [storeCurrency, initialized]);

  const handleCurrencyChange = React.useCallback(
    async (nextCurrency: CurrencyCode) => {
      const current = useUserPreferencesStore.getState();

      if (current.currency === nextCurrency) {
        setCurrency(nextCurrency);
        return;
      }

      const previousCurrency = current.currency;

      setCurrency(nextCurrency);
      setIsPersistingPreferences(true);

      try {
        const updated = await updatePreferences({
          locale: current.locale,
          currency: nextCurrency,
          budgetPeriodCloseDay: current.budgetPeriodCloseDay,
        });

        setPreferences(updated);
      } catch (error) {
        console.error("Failed to update wizard currency preference.", error);
        setCurrency(previousCurrency);
      } finally {
        setIsPersistingPreferences(false);
      }
    },
    [setPreferences],
  );

  return {
    currency,
    isPersistingPreferences,
    handleCurrencyChange,
  };
}
