import { planNextMonth } from "@/api/Services/Budget/budgetService";
import { budgetDashboardMonthQueryKey } from "@/hooks/budget/useBudgetDashboardMonthQuery";
import { budgetMonthsStatusQueryKey } from "@/hooks/budget/useBudgetMonthsStatusQuery";
import { nextMonthPreviewQueryKey } from "@/hooks/budget/useNextMonthPreviewQuery";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function usePlanNextMonthMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: planNextMonth,
    onSuccess: async (result, fromYearMonth) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: budgetMonthsStatusQueryKey(),
        }),
        queryClient.invalidateQueries({
          queryKey: nextMonthPreviewQueryKey(fromYearMonth),
        }),
        queryClient.invalidateQueries({
          queryKey: budgetDashboardMonthQueryKey(result.plannedYearMonth),
        }),
      ]);
    },
  });
}
