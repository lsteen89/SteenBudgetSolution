import type { CurrencyCode } from "@/utils/money/currency";

const cache = new Map<string, Intl.NumberFormat>();

type FormatterOpts = {
  currencyDisplay?: Intl.NumberFormatOptions["currencyDisplay"];
  fractionDigits?: number; // if set => fixed min/max
};

function makeKey(
  locale: string | undefined,
  currency: CurrencyCode,
  opts?: FormatterOpts,
) {
  const loc = locale ?? "default";
  const cd = opts?.currencyDisplay ?? "narrowSymbol";
  const fdKey =
    opts?.fractionDigits === undefined ? "auto" : String(opts.fractionDigits);

  return `${loc}|${currency}|${cd}|${fdKey}`;
}

function safeFormatter(
  locale: string | undefined,
  currency: CurrencyCode,
  opts?: FormatterOpts,
) {
  const key = makeKey(locale, currency, opts);
  const existing = cache.get(key);
  if (existing) return existing;

  const currencyDisplay = opts?.currencyDisplay ?? "narrowSymbol";
  const fd = opts?.fractionDigits;

  try {
    const formatOptions: Intl.NumberFormatOptions = {
      style: "currency",
      currency,
      currencyDisplay,
    };

    if (fd !== undefined) {
      formatOptions.minimumFractionDigits = fd;
      formatOptions.maximumFractionDigits = fd;
    }

    const fmt = new Intl.NumberFormat(locale, formatOptions);
    cache.set(key, fmt);
    return fmt;
  } catch {
    const fallbackOptions: Intl.NumberFormatOptions = {};

    if (fd !== undefined) {
      fallbackOptions.minimumFractionDigits = fd;
      fallbackOptions.maximumFractionDigits = fd;
    }

    const fmt = new Intl.NumberFormat(locale, fallbackOptions);
    cache.set(key, fmt);
    return fmt;
  }
}

export function formatMoneyV2(
  value: number | null | undefined,
  currency: CurrencyCode,
  locale?: string,
  opts?: FormatterOpts,
): string {
  const v = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return safeFormatter(locale, currency, opts).format(v);
}

/**
 * Choose `fractionDigits` so whole-krona values stay clean (no trailing zeros)
 * while decimal values render their precision. Pass the result into
 * `formatMoneyV2` to display stored decimals truthfully without hiding cents.
 */
export function moneyDecimalsFor(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  // Treat very small floating-point residue (e.g. 1500.0000000001) as whole.
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-9) return 0;
  return 2;
}

export function formatMoneyPartsV2(
  value: number | null | undefined,
  currency: CurrencyCode,
  opts?: { locale?: string; alwaysSign?: boolean; fractionDigits?: number },
) {
  const locale = opts?.locale;
  const alwaysSign = opts?.alwaysSign ?? false;
  const fractionDigits = opts?.fractionDigits;

  const v = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const abs = Math.abs(v);
  const sign = alwaysSign ? (v < 0 ? "-" : "+") : v < 0 ? "-" : "";

  const fmt = safeFormatter(locale, currency, { fractionDigits });

  const parts = fmt.formatToParts(abs);
  const number = parts
    .filter((p) => p.type !== "currency")
    .map((p) => p.value)
    .join("");
  const curr = parts.find((p) => p.type === "currency")?.value ?? "";

  return { number: `${sign}${number}`, currency: curr };
}

export function formatMoneySplitV2(
  value: number | null | undefined,
  currency: CurrencyCode,
  locale?: string,
  opts?: FormatterOpts,
) {
  const v = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const fmt = safeFormatter(locale, currency, opts);
  const parts = fmt.formatToParts(v);

  const number = parts
    .filter((p) => p.type !== "currency")
    .map((p) => p.value)
    .join("")
    .trim();

  const symbol = parts.find((p) => p.type === "currency")?.value ?? "";

  return { number, symbol };
}
