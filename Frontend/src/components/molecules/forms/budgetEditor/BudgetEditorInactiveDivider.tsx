import { cn } from "@/lib/utils";

type BudgetEditorInactiveDividerProps = {
  /** Quiet uppercase label, e.g. "Inactive — not counted in this month". */
  label: string;
  /** Stable testid for the divider. Defaults to a generic value. */
  testId?: string;
  /** Optional extra classes. */
  className?: string;
};

/**
 * Shared money-flow editor inactive divider.
 *
 * Sits between active rows and the quiet inactive subsection within a ledger
 * group. The visual treatment (border, shell tint, uppercase tracking) is
 * carried over from the original inline divider in
 * `ExpensesLedgerSection` so adoption is visually invariant.
 */
export default function BudgetEditorInactiveDivider({
  label,
  testId = "budget-editor-ledger-inactive-divider",
  className,
}: BudgetEditorInactiveDividerProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "border-t border-eb-stroke/15 bg-[rgb(var(--eb-shell)/0.08)]",
        "px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-eb-text/50 sm:px-6",
        className,
      )}
    >
      {label}
    </div>
  );
}
