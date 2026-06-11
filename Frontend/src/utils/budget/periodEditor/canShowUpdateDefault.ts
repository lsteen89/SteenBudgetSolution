import type { BudgetMonthExpenseItemEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";

// Quick-drawer rule: the dashboard drawer edits the current open month only.
export function canEditMonth(isEditable: boolean, status: string): boolean {
  return isEditable && status === "open";
}

// Full editor-page rule: open and planned months accept edits; closed and
// skipped months are read-only. Mirrors the backend BudgetMonthEditability
// guard so affordances and server behavior cannot drift.
export function canEditSelectedMonth(
  isEditable: boolean,
  status: string,
): boolean {
  return isEditable && (status === "open" || status === "planned");
}

export function canShowUpdateDefault(
  row: BudgetMonthExpenseItemEditorRowDto,
): boolean {
  return row.canUpdateDefault && !row.isMonthOnly && !!row.sourceExpenseItemId;
}
