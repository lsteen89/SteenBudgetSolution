import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import type { CurrencyCode } from "@/utils/money/currency";

/**
 * Read-only projection of what next month would look like if the budget plan
 * is applied unchanged. Mirrors the backend `NextMonthPreviewDto`
 * (`GET /api/budgets/months/{fromYearMonth}/next-preview`).
 *
 * Producing this never inserts a `BudgetMonth` nor materialises month tables —
 * it is a pure projection. All money lives in {@link dashboard}, built by the
 * same backend projector the live dashboard uses, so the frontend must never
 * compute next-month totals itself.
 *
 * - `state: "preview"` — a projection is available from the active open month;
 *   {@link dashboard} is populated.
 * - `state: "unavailable"` — there is no eligible open month to preview from
 *   (no budget, or the from-month is missing/closed/skipped); {@link dashboard}
 *   is `null` and {@link limitations} explains why.
 */
export type NextMonthPreviewState = "preview" | "unavailable";

/**
 * Carry-over assumption baked into the preview. Before the current month
 * closes this is an estimate only, so {@link isFinal} is always `false`.
 *
 * - `mode: "none"` — no carry-over assumed (`source: "none"`).
 * - `mode: "estimatedFull"` — the current open month's live final balance,
 *   floored at zero (`source: "currentMonthLiveFinalBalance"`); a negative
 *   current balance never becomes a negative carry-over.
 */
export type NextMonthPreviewCarryOverDto = {
  mode: "none" | "estimatedFull";
  amount: number;
  source: "none" | "currentMonthLiveFinalBalance";
  isFinal: false;
};

export type NextMonthPreviewDto = {
  fromYearMonth: string;
  previewYearMonth: string;
  state: NextMonthPreviewState;
  basis: "budgetPlan";
  currencyCode: CurrencyCode;
  carryOver: NextMonthPreviewCarryOverDto;
  dashboard: BudgetDashboardDto | null;
  limitations: string[];
};
