/* ──────────────────────── number utilities ──────────────────────── */
export type NullableNum = number | string | null | undefined;

export const toNumber = (v: NullableNum): number => {
  if (typeof v === "number") return isNaN(v) ? 0 : v;
  if (typeof v === "string") {
    const parsed = parseFloat(v.replace(/[^0-9.-]/g, ""));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export const sumArray = (arr: ReadonlyArray<NullableNum>): number =>
  arr.reduce<number>((acc, n) => acc + toNumber(n), 0);

/* ──────────────────────── income utilities ──────────────────────── */
type Freq = "monthly" | "yearly" | undefined;

const toMonthly = (value: NullableNum, freq: Freq = "monthly") =>
  freq === "yearly" ? toNumber(value) / 12 : toNumber(value);

/**
 * Turn any `IncomeFormValues` record into a single **monthly** number.
 * Handles netSalary / yearlySalary, sideHustles[], otherIncome (+ freq).
 */
export const calcMonthlyIncome = (inc: Record<string, any> | undefined): number => {
  if (!inc) return 0;

  const base =
    toMonthly(inc.netSalary, inc.salaryFrequency) +
    toMonthly(inc.yearlySalary, "yearly");

  const hustles = Array.isArray(inc.sideHustles)
    ? inc.sideHustles.reduce<number>(
        (acc, h) =>
          acc +
          toMonthly(
            h?.income ?? h?.yearlyIncome,
            (h?.frequency as Freq) ?? (h?.yearlyIncome ? "yearly" : "monthly"),
          ),
        0,
      )
    : 0;

  const extra = toMonthly(
    inc.otherIncome,
    (inc.otherIncomeFrequency as Freq) ?? "monthly",
  );

  return base + hustles + extra;
};
export const lighten = (hex: string, pct = 0.5) => {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((n >> 16) & 255) + 255 * pct) | 0;
  const g = Math.min(255, ((n >> 8) & 255) + 255 * pct) | 0;
  const b = Math.min(255, (n & 255) + 255 * pct) | 0;
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
};
