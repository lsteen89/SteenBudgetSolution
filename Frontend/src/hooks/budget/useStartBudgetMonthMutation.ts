import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startBudgetMonth } from "@/api/Services/Budget/budgetService";
import { budgetDashboardMonthQueryKey } from "@/hooks/budget/useBudgetDashboardMonthQuery";
import { budgetMonthsStatusQueryKey } from "@/hooks/budget/useBudgetMonthsStatusQuery";

export function useStartBudgetMonthMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: startBudgetMonth,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: budgetMonthsStatusQueryKey() });
      await qc.invalidateQueries({ queryKey: budgetDashboardMonthQueryKey() });
    },
  });
}
