import type { CurrencyCode } from "@/utils/money/currency";

const cache = new Map<string, Intl.NumberFormat>();

function safeFormatter(locale: string | undefined, currency: CurrencyCode) {
    const key = `${locale ?? "default"}|${currency}`;
    const existing = cache.get(key);
    if (existing) return existing;

    // Try currency formatter first (may throw if currency is invalid)
    try {
        const fmt = new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
            currencyDisplay: "narrowSymbol",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        cache.set(key, fmt);
        return fmt;
    } catch {
        // Fallback: plain number formatter (no currency)
        const fmt = new Intl.NumberFormat(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        cache.set(key, fmt);
        return fmt;
    }
}

export function formatMoneyV2(
    value: number | null | undefined,
    currency: CurrencyCode,
    locale?: string // undefined => browser default
) {
    const v = typeof value === "number" && Number.isFinite(value) ? value : 0;
    return safeFormatter(locale, currency).format(v);
}

export function formatMoneyPartsV2(
    value: number | null | undefined,
    currency: CurrencyCode,
    opts?: { locale?: string; alwaysSign?: boolean }
) {
    const locale = opts?.locale;
    const alwaysSign = opts?.alwaysSign ?? false;

    const v = typeof value === "number" && Number.isFinite(value) ? value : 0;
    const abs = Math.abs(v);
    const sign = alwaysSign ? (v < 0 ? "-" : "+") : v < 0 ? "-" : "";

    const fmt = safeFormatter(locale, currency);

    // If fallback formatter was used (no currency), formatToParts may not include currency
    const parts = fmt.formatToParts(abs);

    const number = parts.filter((p) => p.type !== "currency").map((p) => p.value).join("");
    const curr = parts.find((p) => p.type === "currency")?.value ?? "";

    return { number: `${sign}${number}`, currency: curr };
}
