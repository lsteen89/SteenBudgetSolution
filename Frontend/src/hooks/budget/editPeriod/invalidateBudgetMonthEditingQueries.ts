import type { QueryClient } from "@tanstack/react-query";

import { budgetDashboardMonthQueryKey } from "@/hooks/budget/useBudgetDashboardMonthQuery";
import { budgetMonthRecapQueryKey } from "@/hooks/budget/useBudgetMonthRecapQuery";

import { monthEditorQueryKeys } from "./monthEditorQueryKeys";

/**
 * Invalidate every query that reads budget-month-scoped editor data for the
 * given yearMonth. Used by all expense edit mutations today; income, savings,
 * and debt mutations should reuse this helper as those slices come online.
 */
export function invalidateBudgetMonthEditingQueries(
  queryClient: QueryClient,
  yearMonth: string,
): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: monthEditorQueryKeys.editor(yearMonth),
    }),
    queryClient.invalidateQueries({
      queryKey: monthEditorQueryKeys.incomeItems(yearMonth),
    }),
    queryClient.invalidateQueries({
      queryKey: monthEditorQueryKeys.savingsGoals(yearMonth),
    }),
    queryClient.invalidateQueries({
      queryKey: monthEditorQueryKeys.savingsOldGoals(yearMonth),
    }),
    queryClient.invalidateQueries({
      queryKey: monthEditorQueryKeys.savingsMethods(yearMonth),
    }),
    queryClient.invalidateQueries({
      queryKey: monthEditorQueryKeys.debtItems(yearMonth),
    }),
    queryClient.invalidateQueries({
      queryKey: monthEditorQueryKeys.debtEditor(yearMonth),
    }),
    queryClient.invalidateQueries({
      queryKey: budgetDashboardMonthQueryKey(yearMonth),
    }),
    queryClient.invalidateQueries({
      queryKey: budgetMonthRecapQueryKey(yearMonth),
    }),
  ]).then(() => undefined);
}
