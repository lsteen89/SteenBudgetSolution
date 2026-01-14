import type { CurrencyCode } from "@/utils/money/currency";

export function useAppCurrency(): CurrencyCode {
    // TEMP: until BE/user settings exist
    return "SEK";
}

export function useAppLocale(): string {
    // TEMP: until user settings exist
    return "sv-SE";
}
