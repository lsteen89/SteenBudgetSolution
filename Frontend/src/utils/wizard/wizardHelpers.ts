import { Frequency } from "@/types/common";

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
export type Freq = "Monthly" | "Yearly" | "Weekly" | undefined;


export const toMonthly = (value: NullableNum, freq: Frequency = "Monthly") => {
  const n = toNumber(value);

  switch (freq) {
    case "Yearly":
      return n / 12;
    case "Quarterly":
      return n * 4 / 12; // = n / 3
    case "Weekly":
      return (n * 52) / 12;
    case "BiWeekly":
      return (n * 26) / 12;
    case "Monthly":
    case "Other":
    case "Unknown":
    default:
      return n;
  }
};

/**
 * Turn any `IncomeFormValues` record into a single **monthly** number.
 * Handles netSalary / yearlySalary, sideHustles[], otherIncome (+ freq).
 */
export const calcMonthlyIncome = (inc: Record<string, any> | undefined): number => {
  if (!inc) return 0;

  const base =
    toMonthly(inc.netSalary, inc.salaryFrequency) +
    toMonthly(inc.yearlySalary, "Yearly");

  const members = Array.isArray(inc.householdMembers)
    ? inc.householdMembers.reduce<number>(
      (acc, m) =>
        acc +
        toMonthly(
          m?.income ?? m?.yearlyIncome,
          (m?.frequency as Freq) ?? (m?.yearlyIncome ? "Yearly" : "Monthly"),
        ),
      0,
    )
    : 0;

  const hustles = Array.isArray(inc.sideHustles)
    ? inc.sideHustles.reduce<number>(
      (acc, h) =>
        acc +
        toMonthly(
          h?.income ?? h?.yearlyIncome,
          (h?.frequency as Freq) ?? (h?.yearlyIncome ? "Yearly" : "Monthly"),
        ),
      0,
    )
    : 0;

  const extra = toMonthly(inc.otherIncome, (inc.otherIncomeFrequency as Freq) ?? "Monthly");

  return base + members + hustles + extra;
};
/* ──────────────────────── color utilities ──────────────────────── */
/**
 * Lightens a hex color by the given percentage (0 to 1).
 */
export const lighten = (hex: string, pct = 0.5) => {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((n >> 16) & 255) + 255 * pct) | 0;
  const g = Math.min(255, ((n >> 8) & 255) + 255 * pct) | 0;
  const b = Math.min(255, (n & 255) + 255 * pct) | 0;
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
};

export const hasAnyWizardData = (wd?: {
  income?: unknown;
  expenditure?: unknown;
  savings?: unknown;
  debts?: unknown;
} | null): boolean => {
  if (!wd) return false;
  const vals = [wd.income, wd.expenditure, wd.savings, wd.debts];
  return vals.some(v => {
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.keys(v as object).length > 0;
    return true;
  });
};