import { cn } from "@/lib/utils";

type BudgetEditorEmptyRowProps = {
  /** The empty-state copy shown inside the row. */
  text: string;
  /** Optional override classes for callers that need a different visual weight. */
  className?: string;
};

/**
 * Shared money-flow editor empty row.
 *
 * Used as the placeholder slot inside a ledger group body when there are no
 * rows to render. Visual treatment matches the original
 * `ExpenseEditorEmptyState` exactly so swapping it in is a no-op for expenses
 * and ready to be reused by income.
 */
export default function BudgetEditorEmptyRow({
  text,
  className,
}: BudgetEditorEmptyRowProps) {
  return (
    <div
      className={cn(
        "border-t border-eb-stroke/20 px-4 py-6 text-sm text-eb-text/50",
        className,
      )}
    >
      {text}
    </div>
  );
}
