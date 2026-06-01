import {
  addBudgetMonthSavingsMethod,
  cancelBudgetMonthSavingsGoal,
  changeBudgetMonthSavingsGoalTargetAmount,
  completeBudgetMonthSavingsGoal,
  createBudgetMonthExpenseItem,
  createBudgetMonthIncomeItem,
  createBudgetMonthSavingsGoal,
  deleteBudgetMonthExpenseItem,
  deleteBudgetMonthIncomeItem,
  getBudgetMonthDebtEditor,
  getBudgetMonthDebts,
  getBudgetMonthIncomeItems,
  getBudgetMonthSavingsGoals,
  getBudgetMonthSavingsMethods,
  getBudgetMonthSavingsOldGoals,
  getBudgetMonthEditor,
  patchBudgetMonthBaseSavings,
  patchBudgetMonthDebt,
  patchBudgetMonthDebtsBulk,
  patchBudgetMonthExpenseItem,
  patchBudgetMonthExpenseItemsBulk,
  patchBudgetMonthIncomeItem,
  patchBudgetMonthIncomeItemsBulk,
  patchBudgetMonthSavingsGoal,
  patchBudgetMonthSavingsGoalsBulk,
  renameBudgetMonthSavingsGoal,
  removeBudgetMonthSavingsGoal,
  removeBudgetMonthSavingsMethod,
  transferBudgetMonthSavingsGoal,
} from "@/api/Services/Budget/editor/monthEditor.api";
import type { SavingsMethodCode } from "@/types/budget/SavingsMethodDto";
import type {
  CreateBudgetMonthExpenseItemRequestDto,
  CreateBudgetMonthIncomeItemRequestDto,
  CreateBudgetMonthSavingsGoalRequestDto,
  PatchBudgetMonthBaseSavingsRequestDto,
  PatchBudgetMonthDebtBulkRowDto,
  PatchBudgetMonthDebtRequestDto,
  PatchBudgetMonthExpenseItemBulkRowDto,
  PatchBudgetMonthExpenseItemRequestDto,
  PatchBudgetMonthIncomeItemBulkRowDto,
  PatchBudgetMonthIncomeItemRequestDto,
  PatchBudgetMonthSavingsGoalBulkRowDto,
  PatchBudgetMonthSavingsGoalRequestDto,
  RenameBudgetMonthSavingsGoalRequestDto,
  ChangeBudgetMonthSavingsGoalTargetAmountRequestDto,
  TransferBudgetMonthSavingsGoalRequestDto,
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

export function useBudgetMonthIncomeItems(
  yearMonth: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: monthEditorQueryKeys.incomeItems(yearMonth ?? ""),
    queryFn: () => {
      if (!yearMonth) {
        throw new Error("Missing yearMonth.");
      }

      return getBudgetMonthIncomeItems(yearMonth);
    },
    enabled: enabled && !!yearMonth,
  });
}

export function usePatchBudgetMonthIncomeItem(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      monthIncomeItemId,
      payload,
    }: {
      monthIncomeItemId: string;
      payload: PatchBudgetMonthIncomeItemRequestDto;
    }) => patchBudgetMonthIncomeItem(yearMonth, monthIncomeItemId, payload),
    onSuccess: () => invalidateBudgetMonthEditingQueries(queryClient, yearMonth),
  });
}

export function usePatchBudgetMonthIncomeItemsBulk(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      rows: Array<{
        monthIncomeItemId: string;
        payload: PatchBudgetMonthIncomeItemRequestDto;
      }>,
    ) => {
      const flatRows: PatchBudgetMonthIncomeItemBulkRowDto[] = rows.map(
        (row) => ({
          monthIncomeItemId: row.monthIncomeItemId,
          name: row.payload.name,
          amountMonthly: row.payload.amountMonthly,
          isActive: row.payload.isActive,
          updateDefault: row.payload.updateDefault,
          scope: row.payload.scope,
        }),
      );

      return patchBudgetMonthIncomeItemsBulk(yearMonth, flatRows);
    },
    onSuccess: () => invalidateBudgetMonthEditingQueries(queryClient, yearMonth),
  });
}

export function useCreateBudgetMonthIncomeItem(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBudgetMonthIncomeItemRequestDto) =>
      createBudgetMonthIncomeItem(yearMonth, payload),
    onSuccess: () => invalidateBudgetMonthEditingQueries(queryClient, yearMonth),
  });
}

export function useDeleteBudgetMonthIncomeItem(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (monthIncomeItemId: string) =>
      deleteBudgetMonthIncomeItem(yearMonth, monthIncomeItemId),
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

export function useBudgetMonthSavingsGoals(
  yearMonth: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: monthEditorQueryKeys.savingsGoals(yearMonth ?? ""),
    queryFn: () => {
      if (!yearMonth) {
        throw new Error("Missing yearMonth.");
      }

      return getBudgetMonthSavingsGoals(yearMonth);
    },
    enabled: enabled && !!yearMonth,
  });
}

export function useBudgetMonthSavingsOldGoals(
  yearMonth: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: monthEditorQueryKeys.savingsOldGoals(yearMonth ?? ""),
    queryFn: () => {
      if (!yearMonth) {
        throw new Error("Missing yearMonth.");
      }

      return getBudgetMonthSavingsOldGoals(yearMonth);
    },
    enabled: enabled && !!yearMonth,
  });
}

export function useBudgetMonthSavingsMethods(
  yearMonth: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: monthEditorQueryKeys.savingsMethods(yearMonth ?? ""),
    queryFn: () => {
      if (!yearMonth) {
        throw new Error("Missing yearMonth.");
      }

      return getBudgetMonthSavingsMethods(yearMonth);
    },
    enabled: enabled && !!yearMonth,
  });
}

export function useAddBudgetMonthSavingsMethod(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      code: SavingsMethodCode;
      customLabel?: string | null;
    }) => addBudgetMonthSavingsMethod(yearMonth, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: monthEditorQueryKeys.savingsMethods(yearMonth),
      }),
  });
}

export function useRemoveBudgetMonthSavingsMethod(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (savingsMethodId: string) =>
      removeBudgetMonthSavingsMethod(yearMonth, savingsMethodId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: monthEditorQueryKeys.savingsMethods(yearMonth),
      }),
  });
}

export function usePatchBudgetMonthSavingsGoal(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      monthSavingsGoalId,
      payload,
    }: {
      monthSavingsGoalId: string;
      payload: PatchBudgetMonthSavingsGoalRequestDto;
    }) => patchBudgetMonthSavingsGoal(yearMonth, monthSavingsGoalId, payload),
    onSuccess: () => invalidateBudgetMonthEditingQueries(queryClient, yearMonth),
  });
}

/**
 * Transactional bulk patch. Sends one PATCH request to
 * `/api/budgets/months/{yearMonth}/savings-goals`; the backend either applies
 * every row or rolls back the whole transaction.
 */
export function usePatchBudgetMonthSavingsGoalsBulk(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      rows: Array<{
        monthSavingsGoalId: string;
        payload: PatchBudgetMonthSavingsGoalRequestDto;
      }>,
    ) => {
      const flatRows: PatchBudgetMonthSavingsGoalBulkRowDto[] = rows.map(
        (row) => ({
          monthSavingsGoalId: row.monthSavingsGoalId,
          monthlyContribution: row.payload.monthlyContribution,
          scope: row.payload.scope,
        }),
      );

      return patchBudgetMonthSavingsGoalsBulk(yearMonth, flatRows);
    },
    onSuccess: () => invalidateBudgetMonthEditingQueries(queryClient, yearMonth),
  });
}

export function useCreateBudgetMonthSavingsGoal(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBudgetMonthSavingsGoalRequestDto) =>
      createBudgetMonthSavingsGoal(yearMonth, payload),
    onSuccess: () => invalidateBudgetMonthEditingQueries(queryClient, yearMonth),
  });
}

export function useCompleteSavingsGoalMutation(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (monthSavingsGoalId: string) =>
      completeBudgetMonthSavingsGoal(yearMonth, monthSavingsGoalId),
    onSuccess: () => invalidateBudgetMonthEditingQueries(queryClient, yearMonth),
  });
}

export function useCancelSavingsGoalMutation(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (monthSavingsGoalId: string) =>
      cancelBudgetMonthSavingsGoal(yearMonth, monthSavingsGoalId),
    onSuccess: () => invalidateBudgetMonthEditingQueries(queryClient, yearMonth),
  });
}

export function usePatchBudgetMonthBaseSavings(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PatchBudgetMonthBaseSavingsRequestDto) =>
      patchBudgetMonthBaseSavings(yearMonth, payload),
    onSuccess: () => invalidateBudgetMonthEditingQueries(queryClient, yearMonth),
  });
}

/**
 * V2 PR-05 — rename a savings goal from the kebab menu. The BE
 * short-circuits no-op writes (same name after trim) without an audit
 * row, but on success we still invalidate the editor surfaces so any
 * other open card or aggregate that joined to `Name` picks up the
 * change without a hard reload.
 */
export function useRenameBudgetMonthSavingsGoalMutation(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      monthSavingsGoalId,
      payload,
    }: {
      monthSavingsGoalId: string;
      payload: RenameBudgetMonthSavingsGoalRequestDto;
    }) =>
      renameBudgetMonthSavingsGoal(yearMonth, monthSavingsGoalId, payload),
    onSuccess: () => invalidateBudgetMonthEditingQueries(queryClient, yearMonth),
  });
}

/**
 * V2 PR-06 — change a savings goal's target amount from the kebab
 * menu. Same invalidation set as the rename mutation — both progress
 * percentages (which use the new denominator) and the dashboard
 * planned-marker need a re-read.
 */
export function useChangeBudgetMonthSavingsGoalTargetAmountMutation(
  yearMonth: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      monthSavingsGoalId,
      payload,
    }: {
      monthSavingsGoalId: string;
      payload: ChangeBudgetMonthSavingsGoalTargetAmountRequestDto;
    }) =>
      changeBudgetMonthSavingsGoalTargetAmount(
        yearMonth,
        monthSavingsGoalId,
        payload,
      ),
    onSuccess: () => invalidateBudgetMonthEditingQueries(queryClient, yearMonth),
  });
}

/**
 * V2 PR-09 — one-time goal transfer (Sätt in / Ta ut). The mutation is
 * non-idempotent (every call writes an audit row + delta); the modal's
 * Save button must stay disabled while the mutation is in flight. On
 * success we invalidate the same editor surfaces as a regular goal
 * patch so the dashboard balance strip and goals list both re-read with
 * the new `AmountSaved` value.
 */
export function useTransferBudgetMonthSavingsGoalMutation(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      monthSavingsGoalId,
      payload,
    }: {
      monthSavingsGoalId: string;
      payload: TransferBudgetMonthSavingsGoalRequestDto;
    }) =>
      transferBudgetMonthSavingsGoal(yearMonth, monthSavingsGoalId, payload),
    onSuccess: () => invalidateBudgetMonthEditingQueries(queryClient, yearMonth),
  });
}

export function useRemoveSavingsGoalMutation(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (monthSavingsGoalId: string) =>
      removeBudgetMonthSavingsGoal(yearMonth, monthSavingsGoalId),
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

export function useBudgetMonthDebts(
  yearMonth: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: monthEditorQueryKeys.debtItems(yearMonth ?? ""),
    queryFn: () => {
      if (!yearMonth) {
        throw new Error("Missing yearMonth.");
      }

      return getBudgetMonthDebts(yearMonth);
    },
    enabled: enabled && !!yearMonth,
  });
}

/**
 * Debt PR 5 target editor read model. Returns hero summary, grouped rows
 * with action permissions, optional progress, and recent events for the
 * given month. PR 6's shell renders entirely from this hook.
 */
export function useBudgetMonthDebtEditor(
  yearMonth: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: monthEditorQueryKeys.debtEditor(yearMonth ?? ""),
    queryFn: () => {
      if (!yearMonth) {
        throw new Error("Missing yearMonth.");
      }

      return getBudgetMonthDebtEditor(yearMonth);
    },
    enabled: enabled && !!yearMonth,
  });
}

export function usePatchBudgetMonthDebt(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      monthDebtId,
      payload,
    }: {
      monthDebtId: string;
      payload: PatchBudgetMonthDebtRequestDto;
    }) => patchBudgetMonthDebt(yearMonth, monthDebtId, payload),
    onSuccess: () => invalidateBudgetMonthEditingQueries(queryClient, yearMonth),
  });
}

/**
 * Transactional bulk patch. Sends one PATCH request to
 * `/api/budgets/months/{yearMonth}/debt-items`; the backend either applies
 * every row or rolls back the whole transaction.
 */
export function usePatchBudgetMonthDebtsBulk(yearMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      rows: Array<{
        monthDebtId: string;
        payload: PatchBudgetMonthDebtRequestDto;
      }>,
    ) => {
      const flatRows: PatchBudgetMonthDebtBulkRowDto[] = rows.map((row) => ({
        monthDebtId: row.monthDebtId,
        monthlyPayment: row.payload.monthlyPayment,
        scope: row.payload.scope,
      }));

      return patchBudgetMonthDebtsBulk(yearMonth, flatRows);
    },
    onSuccess: () => invalidateBudgetMonthEditingQueries(queryClient, yearMonth),
  });
}
