import { cn } from "@/lib/utils";

import type { DashboardTerms } from "@/domain/budget/dashboardTerms";

/**
 * Caller-provided labels. AllocationBar is purely presentational; every
 * user-facing string is owned by the consuming i18n dictionary.
 */
export type AllocationBarLabels = {
  /** Accessible name for the whole bar. */
  ariaLabel: string;
  expenses: string;
  savings: string;
  debts: string;
  /** Label for the surplus segment when commitments fit inside available money. */
  free: string;
  /** Aria description for the "money runs out" marker in a deficit. */
  runsOutMarker: string;
};

/**
 * The four terms the bar visualises.
 *
 * `remaining` is the **backend-authoritative** remaining money for the
 * period (`finalBalanceWithCarryMonthly` for open months,
 * `finalBalanceMonthly` for closed snapshots). The bar drives its
 * surplus/deficit decision off this number — it does not re-derive
 * remaining from `income + carryOver - expenses - savings - debts`.
 *
 * This is structural: it guarantees that AllocationBar and the surrounding
 * MoneyState anchor can never disagree about how much money is left, even
 * when the client-side equation and the backend drift apart (see
 * `DashboardTermsResult.reconciles` in `dashboardTerms.ts`). Callers should
 * pass `buildDashboardTerms(dto).terms` directly.
 */
export type AllocationBarTerms = Pick<
  DashboardTerms,
  "expenses" | "savings" | "debts" | "remaining"
>;

type AllocationBarProps = {
  terms: AllocationBarTerms;
  labels: AllocationBarLabels;
  testId?: string;
  className?: string;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clampNonNegative = (n: number) => (n > 0 ? n : 0);

const RENDER_EPSILON = 0.005;

export type AllocationSegmentKey = "expenses" | "savings" | "debts" | "free";

/**
 * Calm allocation palette — navy → blue → amber → green. Planned outflows are
 * never danger red; that tone is reserved for the deficit runs-out marker.
 * Shared so the bar and any legend stay colour-consistent.
 */
export const ALLOCATION_SEGMENT_BAR_CLASS: Record<
  AllocationSegmentKey,
  string
> = {
  expenses: "bg-eb-shell3",
  savings: "bg-eb-shell2",
  debts: "bg-eb-alert",
  free: "bg-eb-accent",
};

/**
 * The visible allocation segments for these terms, in canonical order. Mirrors
 * exactly what {@link AllocationBar} renders (committed segments always; the
 * free segment only on the surplus side) so a caller-rendered legend can stay
 * in sync with the bar without duplicating the visibility rules.
 */
export function getVisibleAllocationSegments(
  terms: AllocationBarTerms,
): Array<{ key: AllocationSegmentKey; amount: number }> {
  const expenses = clampNonNegative(round2(terms.expenses));
  const savings = clampNonNegative(round2(terms.savings));
  const debts = clampNonNegative(round2(terms.debts));
  const remaining = round2(terms.remaining);
  const isDeficit = remaining < -RENDER_EPSILON;
  const free = isDeficit ? 0 : clampNonNegative(remaining);

  const all: Array<{ key: AllocationSegmentKey; amount: number }> = [
    { key: "expenses", amount: expenses },
    { key: "savings", amount: savings },
    { key: "debts", amount: debts },
  ];
  if (free > 0) all.push({ key: "free", amount: free });
  return all.filter((segment) => segment.amount > 0);
}

/**
 * Dashboard allocation flow bar (V2 blueprint grammar).
 *
 * Renders the split as discrete rectangular segments — 16px tall, separated
 * by explicit gaps, each with a small 4px radius — rather than one rounded
 * progress pill. Segments size proportionally via `flex-grow` (the amount is
 * the grow factor), with a small min-width so tiny-but-real amounts stay
 * visible. The split is anchored to backend-authoritative `terms.remaining`
 * so the bar never disagrees with the surrounding MoneyState anchor.
 *
 * - **Surplus / balanced** (`remaining >= 0`):
 *   up to four proportional segments — expenses, savings, debts, free —
 *   share the track against an implicit inflow of `committed + remaining`.
 *
 * - **Deficit** (`remaining < 0`):
 *   the three committed segments share the track against the `committed`
 *   denominator, and a thin danger marker shows where the month's money
 *   runs out — the committed span past it is what the plan does not fund.
 *
 * When the implicit inflow is non-positive (catastrophic deficit — backend
 * remaining is negative beyond the committed total), the runs-out marker
 * sits at 0%; the committed segments stay visible to show what was
 * committed.
 *
 * The bar is safe to render regardless of `DashboardTermsResult.reconciles`
 * — it follows backend remaining either way. Reconciliation drift should
 * drive higher-level concerns (logging, telemetry, a soft warning banner),
 * not bar visibility.
 */
export default function AllocationBar({
  terms,
  labels,
  testId = "allocation-bar",
  className,
}: AllocationBarProps) {
  const expenses = clampNonNegative(round2(terms.expenses));
  const savings = clampNonNegative(round2(terms.savings));
  const debts = clampNonNegative(round2(terms.debts));
  const committed = round2(expenses + savings + debts);
  const remaining = round2(terms.remaining);

  const isDeficit = remaining < -RENDER_EPSILON;
  // Surplus side: free chunk is backend remaining itself.
  const free = isDeficit ? 0 : clampNonNegative(remaining);
  // Implicit inflow (the money the bar treats as available). Backend-driven.
  const inflow = isDeficit
    ? clampNonNegative(committed + remaining)
    : committed + free;

  const runsOutAtPct =
    isDeficit && committed > 0 ? (inflow / committed) * 100 : null;

  const segments: Array<{
    key: string;
    amount: number;
    label: string;
    barClassName: string;
  }> = [
    {
      key: "expenses",
      amount: expenses,
      label: labels.expenses,
      barClassName: ALLOCATION_SEGMENT_BAR_CLASS.expenses,
    },
    {
      key: "savings",
      amount: savings,
      label: labels.savings,
      barClassName: ALLOCATION_SEGMENT_BAR_CLASS.savings,
    },
    {
      key: "debts",
      amount: debts,
      label: labels.debts,
      barClassName: ALLOCATION_SEGMENT_BAR_CLASS.debts,
    },
  ];

  if (!isDeficit && free > 0) {
    segments.push({
      key: "free",
      amount: free,
      label: labels.free,
      barClassName: ALLOCATION_SEGMENT_BAR_CLASS.free,
    });
  }

  const visible = segments.filter((segment) => segment.amount > 0);

  return (
    <div
      data-testid={testId}
      role="img"
      aria-label={labels.ariaLabel}
      className={cn("relative w-full", className)}
    >
      <div className="flex h-4 gap-[3px]">
        {visible.map((segment) => (
          <span
            key={segment.key}
            data-testid={`${testId}-${segment.key}`}
            aria-label={segment.label}
            className={cn(
              "h-full min-w-[8px] rounded-[4px]",
              "shadow-[inset_0_-1px_0_rgb(15_23_42_/_0.06)]",
              segment.barClassName,
            )}
            style={{ flexGrow: segment.amount, flexBasis: 0 }}
          />
        ))}
        {visible.length === 0 ? (
          <span
            aria-hidden="true"
            className="h-full flex-1 rounded-[4px] bg-eb-stroke/30"
          />
        ) : null}
      </div>

      {isDeficit && runsOutAtPct !== null ? (
        <span
          data-testid={`${testId}-runs-out`}
          role="separator"
          aria-label={labels.runsOutMarker}
          className="pointer-events-none absolute -top-1 -bottom-1 w-0.5 rounded-full bg-eb-danger"
          style={{ left: `${runsOutAtPct}%` }}
        />
      ) : null}
    </div>
  );
}
