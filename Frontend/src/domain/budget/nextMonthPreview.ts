import { buildTermsFromLiveDashboard } from "@/domain/budget/dashboardTerms";
import type { DashboardTerms } from "@/domain/budget/dashboardTerms";
import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import type { BudgetMonthListItemDto } from "@/types/budget/BudgetMonthsStatusDto";
import type { NextMonthPreviewDto } from "@/types/budget/NextMonthPreviewDto";

/**
 * Shared next-month preview helpers.
 *
 * Both the dedicated preview page (`NextMonthPreviewPage`) and the dashboard
 * planning row's Next-month card read next-month numbers through this module so
 * the two surfaces classify, guard, and label the projection identically — and
 * so neither one ever computes a next-month total itself. All money originates
 * from the backend `NextMonthPreviewDto.dashboard`.
 */

/** Sub-half-öre band treated as "exactly zero" for money comparisons. */
export const REMAINING_EPSILON = 0.005;

export type RemainingTone = "positive" | "zero" | "negative";

export function classifyRemaining(remaining: number): RemainingTone {
  if (remaining > REMAINING_EPSILON) return "positive";
  if (remaining < -REMAINING_EPSILON) return "negative";
  return "zero";
}

const num0 = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

/**
 * No meaningful budget plan to project: all four plan components are zero.
 * Such a DTO still comes back as `state: "preview"`, so without this guard a
 * success path would render a "0 kr / fully assigned" money state as if it were
 * a real projection. Carry-over is deliberately excluded — it is derived from
 * this month, not the plan, so it never makes an empty plan look funded.
 */
export function isEmptyPlanDashboard(d: BudgetDashboardDto): boolean {
  const income = num0(d.income?.totalIncomeMonthly);
  const expenses = num0(d.expenditure?.totalExpensesMonthly);
  const savings = num0(d.savings?.totalSavingsMonthly);
  const debts = num0(d.debt?.totalMonthlyPayments);
  return (
    Math.abs(income) < REMAINING_EPSILON &&
    Math.abs(expenses) < REMAINING_EPSILON &&
    Math.abs(savings) < REMAINING_EPSILON &&
    Math.abs(debts) < REMAINING_EPSILON
  );
}

/** Month label like "June 2026" / "juni 2026" from a `YYYY-MM` key. */
export function ymLabel(ym: string, locale: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleDateString(locale, { year: "numeric", month: "long" });
}

/**
 * The calendar month after a `YYYY-MM` key. Label/derivation only — never used
 * to compute money — so the planning row can show the next-month label even
 * before (or without) a preview response.
 */
export function nextYearMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1 + 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Backend-authoritative "free to allocate" projection for next month, or `null`
 * when there is no honest number to show — i.e. there is no available preview,
 * or the budget plan is empty (which would otherwise render a meaningless
 * "0 kr"). The number is read from `finalBalanceWithCarryMonthly` via the
 * shared term-builder, the same source the live dashboard and preview page use;
 * the frontend never derives it.
 */
export function selectNextMonthRemaining(
  preview: NextMonthPreviewDto | undefined | null,
): number | null {
  if (!preview || preview.state !== "preview" || !preview.dashboard) return null;
  if (isEmptyPlanDashboard(preview.dashboard)) return null;
  return buildTermsFromLiveDashboard(preview.dashboard).terms.remaining;
}

/** The five equation terms compared between this month and the preview. */
export type NextMonthDeltaKey =
  | "income"
  | "carryOver"
  | "expenses"
  | "savings"
  | "debts";

export interface NextMonthDelta {
  key: NextMonthDeltaKey;
  /** This month's backend value for the term. */
  current: number;
  /** Next month's backend preview value for the term. */
  next: number;
  /** Raw movement of the term: `next − current`. */
  delta: number;
  /** True when the movement is inside the zero band and can be hidden. */
  isZero: boolean;
}

const NEXT_MONTH_DELTA_KEYS: readonly NextMonthDeltaKey[] = [
  "income",
  "carryOver",
  "expenses",
  "savings",
  "debts",
];

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Per-term comparison between this month's terms and the preview's terms —
 * both backend-built via {@link buildTermsFromLiveDashboard}. This is pure
 * subtraction of two backend values per term; it never projects or invents a
 * next-month number. `remaining` is deliberately not a delta row: the preview
 * detail shows it as its own backend-owned headline figure.
 */
export function buildNextMonthDeltas(
  current: DashboardTerms,
  next: DashboardTerms,
): NextMonthDelta[] {
  return NEXT_MONTH_DELTA_KEYS.map((key) => {
    const delta = round2(next[key] - current[key]);
    return {
      key,
      current: current[key],
      next: next[key],
      delta,
      isZero: Math.abs(delta) < REMAINING_EPSILON,
    };
  });
}

export type NextMonthPageState =
  | {
      kind: "unavailable";
      fromYearMonth: null;
      targetYearMonth: null;
      targetMonth: null;
    }
  | {
      kind: "preview" | "planned" | "open";
      fromYearMonth: string;
      targetYearMonth: string;
      targetMonth: BudgetMonthListItemDto | null;
    };

export function deriveNextMonthPageState(input: {
  openMonthYearMonth: string | null | undefined;
  months: BudgetMonthListItemDto[] | null | undefined;
}): NextMonthPageState {
  const fromYearMonth = input.openMonthYearMonth ?? null;

  if (!fromYearMonth) {
    return {
      kind: "unavailable",
      fromYearMonth: null,
      targetYearMonth: null,
      targetMonth: null,
    };
  }

  const targetYearMonth = nextYearMonth(fromYearMonth);
  const targetMonth =
    input.months?.find((month) => month.yearMonth === targetYearMonth) ?? null;

  if (targetMonth?.status === "planned") {
    return {
      kind: "planned",
      fromYearMonth,
      targetYearMonth,
      targetMonth,
    };
  }

  if (targetMonth?.status === "open") {
    return {
      kind: "open",
      fromYearMonth,
      targetYearMonth,
      targetMonth,
    };
  }

  return {
    kind: "preview",
    fromYearMonth,
    targetYearMonth,
    targetMonth: null,
  };
}
