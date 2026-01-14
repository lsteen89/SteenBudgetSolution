import type { CurrencyCode } from "@/utils/money/currency";

const cache = new Map<string, Intl.NumberFormat>();

type FormatterOpts = {
    currencyDisplay?: Intl.NumberFormatOptions["currencyDisplay"];
    fractionDigits?: number; // if set => fixed min/max
};

function makeKey(locale: string | undefined, currency: CurrencyCode, opts?: FormatterOpts) {
    const loc = locale ?? "default";
    const cd = opts?.currencyDisplay ?? "narrowSymbol";
    const fd = opts?.fractionDigits;
    return `${loc}|${currency}|${cd}|${fd ?? "2"}`; // default 2 decimals = current behavior
}

function safeFormatter(
    locale: string | undefined,
    currency: CurrencyCode,
    opts?: FormatterOpts
) {
    const key = makeKey(locale, currency, opts);
    const existing = cache.get(key);
    if (existing) return existing;

    const currencyDisplay = opts?.currencyDisplay ?? "narrowSymbol";
    const fd = opts?.fractionDigits ?? 2;

    // Try currency formatter first (may throw if currency is invalid)
    try {
        const fmt = new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
            currencyDisplay,
            minimumFractionDigits: fd,
            maximumFractionDigits: fd,
        });
        cache.set(key, fmt);
        return fmt;
    } catch {
        // Fallback: plain number formatter (no currency)
        const fmt = new Intl.NumberFormat(locale, {
            minimumFractionDigits: fd,
            maximumFractionDigits: fd,
        });
        cache.set(key, fmt);
        return fmt;
    }
}

/**
 * Legacy-compatible:
 * - existing call sites: formatMoneyV2(value, currency, locale?)
 * - new optional opts without breaking old signature: formatMoneyV2(value, currency, locale?, opts?)
 */
export function formatMoneyV2(
    value: number | null | undefined,
    currency: CurrencyCode,
    locale?: string // undefined => browser default
): string;
export function formatMoneyV2(
    value: number | null | undefined,
    currency: CurrencyCode,
    locale: string | undefined,
    opts?: FormatterOpts
): string;
export function formatMoneyV2(
    value: number | null | undefined,
    currency: CurrencyCode,
    locale?: string,
    opts?: FormatterOpts
) {
    const v = typeof value === "number" && Number.isFinite(value) ? value : 0;
    return safeFormatter(locale, currency, opts).format(v);
}

export function formatMoneyPartsV2(
    value: number | null | undefined,
    currency: CurrencyCode,
    opts?: { locale?: string; alwaysSign?: boolean; fractionDigits?: number }
) {
    const locale = opts?.locale;
    const alwaysSign = opts?.alwaysSign ?? false;
    const fractionDigits = opts?.fractionDigits; // optional, defaults to 2 in safeFormatter

    const v = typeof value === "number" && Number.isFinite(value) ? value : 0;
    const abs = Math.abs(v);
    const sign = alwaysSign ? (v < 0 ? "-" : "+") : v < 0 ? "-" : "";

    const fmt = safeFormatter(locale, currency, { fractionDigits });

    const parts = fmt.formatToParts(abs);
    const number = parts.filter((p) => p.type !== "currency").map((p) => p.value).join("");
    const curr = parts.find((p) => p.type === "currency")?.value ?? "";

    return { number: `${sign}${number}`, currency: curr };
}
