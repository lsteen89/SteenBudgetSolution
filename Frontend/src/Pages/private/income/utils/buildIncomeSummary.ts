import type { BudgetMonthIncomeItemEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";

/**
 * Per-kind income aggregate for the open-month editor view.
 *
 * Mirrors the dashboard's counting rules for income (see
 * `buildDashboardSummaryAggregate.buildOpenMonthAggregate`):
 *
 *   - rows must not be deleted
 *   - rows must be active (`isActive === true`)
 *
 * Salary is always active by backend invariant, but we still respect the
 * `isActive` flag defensively so a stale or unexpected `false` does not
 * fabricate an income number that disagrees with the dashboard total.
 *
 * The summary is the single source of truth for the hero split line — the
 * three per-kind totals always sum to {@link IncomeSummary.total}, which in
 * turn matches the dashboard's `totalIncome` when the dashboard is fresh.
 */
export type IncomeSummary = {
  salaryTotal: number;
  householdTotal: number;
  sideHustleTotal: number;
  /** salaryTotal + householdTotal + sideHustleTotal. */
  total: number;

  salaryActiveCount: number;
  householdActiveCount: number;
  sideHustleActiveCount: number;
  /** Total number of editor rows that contributed to {@link total}. */
  totalActiveCount: number;
};

const EMPTY_SUMMARY: IncomeSummary = {
  salaryTotal: 0,
  householdTotal: 0,
  sideHustleTotal: 0,
  total: 0,
  salaryActiveCount: 0,
  householdActiveCount: 0,
  sideHustleActiveCount: 0,
  totalActiveCount: 0,
};

type BuildIncomeSummaryArgs = {
  rows: ReadonlyArray<BudgetMonthIncomeItemEditorRowDto> | null | undefined;
};

export function buildIncomeSummary({
  rows,
}: BuildIncomeSummaryArgs): IncomeSummary {
  if (!rows || rows.length === 0) return { ...EMPTY_SUMMARY };

  const summary: IncomeSummary = { ...EMPTY_SUMMARY };

  for (const row of rows) {
    if (row.isDeleted) continue;
    if (!row.isActive) continue;

    const amount = Number.isFinite(row.amountMonthly) ? row.amountMonthly : 0;

    switch (row.kind) {
      case "salary":
        summary.salaryTotal += amount;
        summary.salaryActiveCount += 1;
        break;
      case "householdMember":
        summary.householdTotal += amount;
        summary.householdActiveCount += 1;
        break;
      case "sideHustle":
        summary.sideHustleTotal += amount;
        summary.sideHustleActiveCount += 1;
        break;
      default:
        // Unknown future kinds are ignored rather than silently summed into
        // an arbitrary bucket — keeping the hero honest if backend kinds
        // ever expand without frontend updates.
        break;
    }
  }

  summary.total =
    summary.salaryTotal + summary.householdTotal + summary.sideHustleTotal;
  summary.totalActiveCount =
    summary.salaryActiveCount +
    summary.householdActiveCount +
    summary.sideHustleActiveCount;

  return summary;
}
