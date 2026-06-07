import type { BudgetDashboardMonthDto } from "@/types/budget/BudgetDashboardMonthDto";

/**
 * Named six-term dashboard money equation.
 *
 *   income + carryOver - expenses - savings - debts = remaining
 *
 * Carry-over is its own term. It is never folded into income.
 *
 * `remaining` is the **backend-authoritative** value for the period:
 * `finalBalanceWithCarryMonthly` for open months and `finalBalanceMonthly`
 * for closed snapshots. The dashboard displays this value as-is so the UI
 * never disagrees with the backend on what the user has left.
 *
 * The client-side equation result lives on the surrounding
 * `DashboardTermsResult` as `computedRemaining` and is exposed for
 * reconciliation diagnostics only — never for display.
 */
export interface DashboardTerms {
  income: number;
  carryOver: number;
  expenses: number;
  savings: number;
  debts: number;
  remaining: number;
}

/**
 * Reconciliation result.
 *
 * `computedRemaining` is the client's six-term sum. `reconciles` is true when
 * it matches `terms.remaining` within rounding epsilon. When it does not,
 * `terms.remaining` is still the safe display value but the dashboard should
 * log/alert because client and backend disagree about the money equation.
 *
 * Skipped months trivially reconcile at zero.
 */
export interface DashboardTermsResult {
  terms: DashboardTerms;
  computedRemaining: number;
  reconciles: boolean;
  reconcileDelta: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const num0 = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

/**
 * Reconciliation tolerance. One öre covers IEEE 754 drift after summing five
 * rounded terms but still flags real backend/client disagreements.
 */
export const DASHBOARD_TERMS_RECONCILE_EPSILON = 0.01;

export function buildDashboardTerms(
  dto: BudgetDashboardMonthDto,
): DashboardTermsResult {
  switch (dto.month.status) {
    case "open":
      return buildOpenTerms(dto);
    case "closed":
      return buildClosedTerms(dto);
    case "skipped":
      return buildSkippedTerms();
    default:
      throw new Error(
        `Unsupported dashboard month status: ${dto.month.status}`,
      );
  }
}

function buildOpenTerms(dto: BudgetDashboardMonthDto): DashboardTermsResult {
  const live = dto.liveDashboard;
  if (!live) {
    throw new Error(
      `Month ${dto.month.yearMonth} is open but liveDashboard is missing.`,
    );
  }

  const income = round2(num0(live.income?.totalIncomeMonthly));
  const carryOver = round2(num0(live.carryOverAmountMonthly));
  const expenses = round2(num0(live.expenditure?.totalExpensesMonthly));
  const savings = round2(num0(live.savings?.totalSavingsMonthly));
  const debts = round2(num0(live.debt?.totalMonthlyPayments));

  const backendRemaining = round2(num0(live.finalBalanceWithCarryMonthly));
  const computedRemaining = round2(
    income + carryOver - expenses - savings - debts,
  );

  return finalize(
    { income, carryOver, expenses, savings, debts, remaining: backendRemaining },
    computedRemaining,
  );
}

function buildClosedTerms(dto: BudgetDashboardMonthDto): DashboardTermsResult {
  const snapshot = dto.snapshotTotals;
  if (!snapshot) {
    throw new Error(
      `Month ${dto.month.yearMonth} is closed but snapshotTotals is missing.`,
    );
  }

  // The closed-month snapshot does not carry an inbound carry-over field; the
  // snapshot is the settled outcome of the month itself. Modelling carryOver
  // as zero keeps the same six-term shape so consumers can reuse the equation
  // and UI without branching on status.
  const income = round2(num0(snapshot.totalIncomeMonthly));
  const carryOver = 0;
  const expenses = round2(num0(snapshot.totalExpensesMonthly));
  const savings = round2(num0(snapshot.totalSavingsMonthly));
  const debts = round2(num0(snapshot.totalDebtPaymentsMonthly));

  const backendRemaining = round2(num0(snapshot.finalBalanceMonthly));
  const computedRemaining = round2(
    income + carryOver - expenses - savings - debts,
  );

  return finalize(
    { income, carryOver, expenses, savings, debts, remaining: backendRemaining },
    computedRemaining,
  );
}

function buildSkippedTerms(): DashboardTermsResult {
  return {
    terms: {
      income: 0,
      carryOver: 0,
      expenses: 0,
      savings: 0,
      debts: 0,
      remaining: 0,
    },
    computedRemaining: 0,
    reconciles: true,
    reconcileDelta: 0,
  };
}

function finalize(
  terms: DashboardTerms,
  computedRemaining: number,
): DashboardTermsResult {
  const reconcileDelta = round2(
    Math.abs(computedRemaining - terms.remaining),
  );
  return {
    terms,
    computedRemaining,
    reconciles: reconcileDelta <= DASHBOARD_TERMS_RECONCILE_EPSILON,
    reconcileDelta,
  };
}
