import type { CurrencyCode } from "@/utils/money/currency";

export function useResolvedCurrency(): CurrencyCode {
    // TODO: replace with user settings store when implemented
    // const userCurrency = useUserSettingsStore(s => s.defaultCurrency);
    const userCurrency: CurrencyCode | null = null;

    return userCurrency ?? "EUR";
}
