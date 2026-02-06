import type { CurrencyCode } from "@/utils/money/currency";

export function formatMoneyParts(
    value: number,
    currency: CurrencyCode,
    locale: string,
    fractionDigits = 0
) {
    const safe = Number.isFinite(value) ? value : 0;

    const parts = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    }).formatToParts(safe);

    const currencyText = parts.find((p) => p.type === "currency")?.value ?? currency;

    const numberText = parts
        .filter((p) => p.type !== "currency")
        .map((p) => p.value)
        .join("")
        .trim();

    return { numberText, currencyText };
}
