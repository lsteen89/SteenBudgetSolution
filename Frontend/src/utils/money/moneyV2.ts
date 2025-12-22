export type CurrencyCode = string; // ideally restrict to ISO 4217 later

const cache = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: string, currency: CurrencyCode) {
    const key = `${locale}|${currency}`;
    const existing = cache.get(key);
    if (existing) return existing;

    const fmt = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    cache.set(key, fmt);
    return fmt;
}

export function formatMoneyV2(
    value: number | null | undefined,
    currency: CurrencyCode,
    locale = "sv-SE"
) {
    return getFormatter(locale, currency).format(value ?? 0);
}

export function formatMoneyPartsV2(
    value: number | null | undefined,
    currency: CurrencyCode,
    opts?: { locale?: string; alwaysSign?: boolean }
) {
    const locale = opts?.locale ?? "sv-SE";
    const alwaysSign = opts?.alwaysSign ?? false;

    const v = value ?? 0;
    const abs = Math.abs(v);
    const sign = alwaysSign ? (v < 0 ? "-" : "+") : v < 0 ? "-" : "";

    const parts = getFormatter(locale, currency).formatToParts(abs);
    const number = parts.filter(p => p.type !== "currency").map(p => p.value).join("");
    const curr = parts.find(p => p.type === "currency")?.value ?? "";

    return { number: `${sign}${number}`, currency: curr };
}
