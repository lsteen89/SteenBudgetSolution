import type { AppLocale } from "@/types/i18n/appLocale";

export function parseLocalizedNumber(
  value: unknown,
  _locale?: AppLocale,
): number | null {
  if (value === "" || value === null || value === undefined) return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN;
  }

  if (typeof value !== "string") return NaN;

  const raw = value.trim();
  if (raw === "") return null;

  if (!/^[0-9\s.,]+$/.test(raw)) return NaN;

  const compact = raw.replace(/\s+/g, "");

  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");

  const hasComma = lastComma !== -1;
  const hasDot = lastDot !== -1;

  let normalized = compact;

  if (hasComma && hasDot) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";

    if (decimalSeparator === ",") {
      normalized = compact.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = compact.replace(/,/g, "");
    }
  } else if (hasComma) {
    const commaCount = (compact.match(/,/g) ?? []).length;

    if (commaCount > 1) {
      normalized = compact.replace(/,/g, "");
    } else {
      const [left, right] = compact.split(",");
      if (right && right.length <= 2) {
        normalized = `${left}.${right}`;
      } else {
        normalized = compact.replace(/,/g, "");
      }
    }
  } else if (hasDot) {
    const dotCount = (compact.match(/\./g) ?? []).length;

    if (dotCount > 1) {
      normalized = compact.replace(/\./g, "");
    } else {
      const [left, right] = compact.split(".");
      if (right && right.length <= 2) {
        normalized = `${left}.${right}`;
      } else {
        normalized = compact.replace(/\./g, "");
      }
    }
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

export const setValueAsLocalizedNumber = (v: unknown) =>
  parseLocalizedNumber(v);

export const setValueAsNullableNumber = (v: unknown) => parseLocalizedNumber(v);
