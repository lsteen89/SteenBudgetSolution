import type { BudgetMonthExpenseItemEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";

export function canEditMonth(isEditable: boolean, status: string): boolean {
  return isEditable && status === "open";
}

export function canShowUpdateDefault(
  row: BudgetMonthExpenseItemEditorRowDto,
): boolean {
  return row.canUpdateDefault && !row.isMonthOnly && !!row.sourceExpenseItemId;
}
