import {
  createBudgetMonthExpenseItem,
  deleteBudgetMonthExpenseItem,
  getBudgetMonthEditor,
  patchBudgetMonthExpenseItem,
  patchBudgetMonthExpenseItemsBulk,
} from "@/api/Services/Budget/editor/monthEditor.api";
import type {
  CreateBudgetMonthExpenseItemRequestDto,
  PatchBudgetMonthExpenseItemBulkRowDto,
  PatchBudgetMonthExpenseItemRequestDto,
} from "@/types/budget/BudgetMonthsStatusDto";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { invalidateBudgetMonthEditingQueries } from "./invalidateBudgetMonthEditingQueries";
import { monthEditorQueryKeys } from "./monthEditorQueryKeys";

export { monthEditorQueryKeys };

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
    onSuccess: () => invalidateBudgetMonthEditingQueries(queryClient, yearMonth),
  });
}

/**
 * Transactional bulk patch. Sends one PATCH request to
 * `/api/budgets/months/{yearMonth}/expense-items`; the backend either applies
 * every row or rolls back the whole transaction. The hook input shape preserves
 * the legacy `{ monthExpenseItemId, payload: { ... } }` rows so the drawer
 * does not need a wide rewrite — we flatten to the wire DTO before sending.
 */
export function usePatchBudgetMonthExpenseItemsBulk(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      rows: Array<{
        monthExpenseItemId: string;
        payload: PatchBudgetMonthExpenseItemRequestDto;
      }>,
    ) => {
      const flatRows: PatchBudgetMonthExpenseItemBulkRowDto[] = rows.map(
        (row) => ({
          monthExpenseItemId: row.monthExpenseItemId,
          name: row.payload.name,
          categoryId: row.payload.categoryId,
          amountMonthly: row.payload.amountMonthly,
          isActive: row.payload.isActive,
          subscriptionLifecycleStatus: row.payload.subscriptionLifecycleStatus,
          updateDefault: row.payload.updateDefault,
          scope: row.payload.scope,
        }),
      );

      return patchBudgetMonthExpenseItemsBulk(yearMonth, flatRows);
    },
    onSuccess: () => invalidateBudgetMonthEditingQueries(queryClient, yearMonth),
  });
}

export function useCreateBudgetMonthExpenseItem(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBudgetMonthExpenseItemRequestDto) =>
      createBudgetMonthExpenseItem(yearMonth, payload),
    onSuccess: () => invalidateBudgetMonthEditingQueries(queryClient, yearMonth),
  });
}

export function useDeleteBudgetMonthExpenseItem(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (monthExpenseItemId: string) =>
      deleteBudgetMonthExpenseItem(yearMonth, monthExpenseItemId),
    onSuccess: () => invalidateBudgetMonthEditingQueries(queryClient, yearMonth),
  });
}
