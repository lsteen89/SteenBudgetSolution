export function sanitizeMoneyInput(value: string): string {
  return value.replace(/[^\d.,\s-]/g, "");
}

export function normalizeMoneyInput(value: string): string {
  return value.replace(/\s/g, "").replace(",", ".").trim();
}

export function isValidMoneyInput(
  value: string,
  opts?: { allowNegative?: boolean; maxDecimals?: number },
): boolean {
  const normalized = normalizeMoneyInput(value);

  if (normalized === "") return false;

  const allowNegative = opts?.allowNegative ?? false;
  const maxDecimals = opts?.maxDecimals ?? 2;

  const signPart = allowNegative ? "-?" : "";
  const decimalPart = maxDecimals > 0 ? `(\\.\\d{1,${maxDecimals}})?` : "";
  const pattern = new RegExp(`^${signPart}\\d+${decimalPart}$`);

  return pattern.test(normalized);
}

export function parseMoneyInput(
  value: string,
  opts?: { allowNegative?: boolean; maxDecimals?: number },
): number | null {
  const normalized = normalizeMoneyInput(value);

  if (!isValidMoneyInput(normalized, opts)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
