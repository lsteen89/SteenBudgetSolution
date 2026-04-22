import {
  createBudgetMonthExpenseItem,
  deleteBudgetMonthExpenseItem,
  getBudgetMonthEditor,
  patchBudgetMonthExpenseItem,
} from "@/api/Services/Budget/editor/monthEditor.api";
import { budgetDashboardMonthQueryKey } from "@/hooks/budget/useBudgetDashboardMonthQuery";
import type {
  CreateBudgetMonthExpenseItemRequestDto,
  PatchBudgetMonthExpenseItemRequestDto,
} from "@/types/budget/BudgetMonthsStatusDto";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const monthEditorQueryKeys = {
  editor: (yearMonth: string) => ["budget", "month-editor", yearMonth] as const,
};

export function useBudgetMonthEditor(
  yearMonth: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: monthEditorQueryKeys.editor(yearMonth ?? ""),
    queryFn: () => {
      if (!yearMonth) {
        throw new Error("Missing yearMonth.");
      }

      return getBudgetMonthEditor(yearMonth);
    },
    enabled: enabled && !!yearMonth,
  });
}

export function usePatchBudgetMonthExpenseItem(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      monthExpenseItemId,
      payload,
    }: {
      monthExpenseItemId: string;
      payload: PatchBudgetMonthExpenseItemRequestDto;
    }) => patchBudgetMonthExpenseItem(yearMonth, monthExpenseItemId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: monthEditorQueryKeys.editor(yearMonth),
        }),
        queryClient.invalidateQueries({
          queryKey: budgetDashboardMonthQueryKey(yearMonth),
        }),
      ]);
    },
  });
}

export function usePatchBudgetMonthExpenseItemsBulk(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      rows: Array<{
        monthExpenseItemId: string;
        payload: PatchBudgetMonthExpenseItemRequestDto;
      }>,
    ) => {
      await Promise.all(
        rows.map((row) =>
          patchBudgetMonthExpenseItem(
            yearMonth,
            row.monthExpenseItemId,
            row.payload,
          ),
        ),
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: monthEditorQueryKeys.editor(yearMonth),
        }),
        queryClient.invalidateQueries({
          queryKey: budgetDashboardMonthQueryKey(yearMonth),
        }),
      ]);
    },
  });
}

export function useCreateBudgetMonthExpenseItem(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBudgetMonthExpenseItemRequestDto) =>
      createBudgetMonthExpenseItem(yearMonth, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: monthEditorQueryKeys.editor(yearMonth),
        }),
        queryClient.invalidateQueries({
          queryKey: budgetDashboardMonthQueryKey(yearMonth),
        }),
      ]);
    },
  });
}

export function useDeleteBudgetMonthExpenseItem(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (monthExpenseItemId: string) =>
      deleteBudgetMonthExpenseItem(yearMonth, monthExpenseItemId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: monthEditorQueryKeys.editor(yearMonth),
        }),
        queryClient.invalidateQueries({
          queryKey: budgetDashboardMonthQueryKey(yearMonth),
        }),
      ]);
    },
  });
}
