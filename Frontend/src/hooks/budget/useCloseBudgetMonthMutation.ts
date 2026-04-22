import {
  closeBudgetMonth,
  type CloseBudgetMonthRequestDto,
} from "@/api/Services/Budget/budgetService";
import { budgetDashboardMonthQueryKey } from "@/hooks/budget/useBudgetDashboardMonthQuery";
import { budgetMonthsStatusQueryKey } from "@/hooks/budget/useBudgetMonthsStatusQuery";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type CloseBudgetMonthMutationInput = {
  yearMonth: string;
  request: CloseBudgetMonthRequestDto;
};

export function useCloseBudgetMonthMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ yearMonth, request }: CloseBudgetMonthMutationInput) =>
      closeBudgetMonth(yearMonth, request),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: budgetMonthsStatusQueryKey(),
        }),
        queryClient.invalidateQueries({
          queryKey: budgetDashboardMonthQueryKey(),
        }),
      ]);
    },
  });
}
