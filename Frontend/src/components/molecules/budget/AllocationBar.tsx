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
  /** Label for the unfunded-tail overlay in a deficit. */
  unfunded: string;
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
 * never danger red; that tone is reserved for the deficit runs-out marker and
 * the unfunded tail. Shared so the bar and any legend stay colour-consistent.
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
 * Dashboard allocation flow bar.
 *
 * Visualises how this month's available money is split across expenses,
 * savings, debts, and free remaining money. The split is anchored to
 * backend-authoritative `terms.remaining` so the bar never disagrees with
 * the surrounding MoneyState anchor.
 *
 * - **Surplus / balanced** (`remaining >= 0`):
 *   four proportional segments — expenses, savings, debts, free — fill the
 *   bar against an implicit inflow of `committed + remaining`. Segment
 *   widths sum to 100%.
 *
 * - **Deficit** (`remaining < 0`):
 *   the three committed segments fill the bar against a `committed`
 *   denominator (segment widths still sum to 100%). An unfunded-tail
 *   overlay covers the portion of the bar past where money runs out, and a
 *   marker shows that point. The overlay is layered on top of the segments
 *   — no segment ever overflows 100%.
 *
 * When the implicit inflow is non-positive (catastrophic deficit — backend
 * remaining is negative beyond the committed total), the runs-out marker
 * sits at 0% and the unfunded overlay covers the entire bar; the committed
 * segments stay visible underneath to show what was committed.
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

  // Denominator is whichever side actually fills the bar. Segment widths
  // therefore sum to <= 100% in every mode, including catastrophic deficit.
  const denominator = isDeficit
    ? Math.max(committed, 1)
    : Math.max(inflow, 1);

  const widthPct = (amount: number) => {
    if (amount <= 0) return 0;
    const pct = (amount / denominator) * 100;
    return Math.max(0, Math.min(100, pct));
  };

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
      className={cn(
        "relative h-3.5 w-full overflow-hidden rounded-full bg-eb-stroke/40",
        className,
      )}
    >
      <div className="absolute inset-0 flex">
        {visible.map((segment, index) => {
          const isFirst = index === 0;
          const isLast = index === visible.length - 1;
          return (
            <span
              key={segment.key}
              data-testid={`${testId}-${segment.key}`}
              aria-label={segment.label}
              className={cn(
                "h-full shadow-[inset_-1px_0_0_rgb(255_255_255_/_0.55),inset_0_-1px_0_rgb(15_23_42_/_0.06)]",
                isFirst && "rounded-l-full",
                isLast && "rounded-r-full",
                segment.barClassName,
              )}
              style={{ width: `${widthPct(segment.amount)}%` }}
            />
          );
        })}
      </div>

      {isDeficit && runsOutAtPct !== null ? (
        <span
          data-testid={`${testId}-unfunded`}
          role="presentation"
          aria-label={labels.unfunded}
          className="pointer-events-none absolute top-0 bottom-0 bg-eb-danger/15 [background-image:repeating-linear-gradient(45deg,rgb(var(--eb-danger)/0.55)_0_6px,transparent_6px_12px)]"
          style={{ left: `${runsOutAtPct}%`, right: 0 }}
        />
      ) : null}

      {isDeficit && runsOutAtPct !== null ? (
        <span
          data-testid={`${testId}-runs-out`}
          role="separator"
          aria-label={labels.runsOutMarker}
          className="pointer-events-none absolute -top-1 -bottom-1 w-px bg-eb-text/80"
          style={{ left: `${runsOutAtPct}%` }}
        />
      ) : null}
    </div>
  );
}
