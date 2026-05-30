import { cn } from "@/lib/utils";

export type BudgetEditorSegmentedBarSegment = {
  /** Stable key used for React reconciliation and the per-segment testid. */
  key: string;
  /** Localised label, used as part of the accessible name when listed. */
  label: string;
  /** Non-negative amount this segment represents. Zero segments are hidden. */
  amount: number;
  /** Tailwind classes that paint the bar fill for this segment. */
  barClassName: string;
};

type BudgetEditorSegmentedBarProps = {
  /**
   * Segments in display order. Zero-amount segments are omitted from the bar
   * so the visible chunks always represent real money.
   */
  segments: BudgetEditorSegmentedBarSegment[];
  /**
   * Total used as the denominator when computing each segment width. The
   * caller passes this explicitly so the bar reconciles with whichever total
   * the surrounding strip headline uses.
   *
   * If the visible segments sum to more than `denominator`, the bar would
   * overflow at >100% width. To avoid that — and to handle the legitimate
   * income case where committed outflows exceed available money — the bar
   * normalises to `max(denominator, visibleTotal, 1)`. Segments still keep
   * their relative proportions; the bar simply fits inside its container.
   */
  denominator: number;
  /** Accessible name used by screen readers ("Spend breakdown" etc.). */
  ariaLabel: string;
  /** Testid for the bar container. */
  testId?: string;
  /**
   * Testid prefix for the per-segment elements. Defaults to the container
   * testid so segments are auto-suffixed (`{testId}-{segment.key}`).
   */
  segmentTestIdPrefix?: string;
  /** Optional extra classes appended to the bar container. */
  className?: string;
};

/**
 * Shared money-flow editor segmented proportional bar.
 *
 * Pulled out of `ExpensesPlanBalanceStrip` so the income distribution strip
 * can reuse the exact same visual recipe: 4px gap between segments, pilled
 * outer ends, soft inset bottom shadow for depth. The component is purely
 * presentational — semantics, copy, and tone live in the surrounding strip.
 */
export default function BudgetEditorSegmentedBar({
  segments,
  denominator,
  ariaLabel,
  testId = "budget-editor-segmented-bar",
  segmentTestIdPrefix,
  className,
}: BudgetEditorSegmentedBarProps) {
  const visibleSegments = segments.filter((segment) => segment.amount > 0);
  // Fit denominator: never less than the actual visible total, and never zero.
  // This preserves caller-supplied proportions when the caller's denominator
  // covers all segments (expenses today) and prevents overflow when committed
  // outflows exceed the headline number (income, when free-kvar is negative).
  const visibleTotal = visibleSegments.reduce(
    (sum, segment) => sum + segment.amount,
    0,
  );
  const safeDenominator = Math.max(denominator, visibleTotal, 1);
  const prefix = segmentTestIdPrefix ?? testId;

  return (
    <div
      data-testid={testId}
      role="img"
      aria-label={ariaLabel}
      className={cn("flex h-3.5 w-full gap-1", className)}
    >
      {visibleSegments.map((segment, index) => {
        const widthPct = (segment.amount / safeDenominator) * 100;
        const isFirst = index === 0;
        const isLast = index === visibleSegments.length - 1;
        return (
          <span
            key={segment.key}
            data-testid={`${prefix}-${segment.key}`}
            className={cn(
              "h-full shadow-[inset_0_-1px_0_rgb(15_23_42_/_0.06)]",
              isFirst ? "rounded-l-full" : "rounded-l",
              isLast ? "rounded-r-full" : "rounded-r",
              segment.barClassName,
            )}
            style={{ width: `${widthPct}%`, minWidth: "20px" }}
          />
        );
      })}
    </div>
  );
}
