import type { ApiEnvelope } from "@/api/api.types";
import { api } from "@/api/axios";
import { unwrapEnvelopeData } from "@/api/envelope";
import type { BudgetMonthSavingsGoalArchiveRowDto } from "@/types/budget/BudgetMonthSavingsGoalArchiveRowDto";
import type {
  SavingsMethodCode,
  SavingsMethodDto,
} from "@/types/budget/SavingsMethodDto";
import type {
  BudgetMonthBaseSavingsEditorDto,
  BudgetMonthEditorDto,
  BudgetMonthDebtEditorRowDto,
  BudgetMonthIncomeItemEditorRowDto,
  BudgetMonthExpenseItemEditorRowDto,
  BudgetMonthSavingsGoalEditorRowDto,
  CreateBudgetMonthIncomeItemRequestDto,
  CreateBudgetMonthExpenseItemRequestDto,
  CreateBudgetMonthSavingsGoalRequestDto,
  PatchBudgetMonthBaseSavingsRequestDto,
  PatchBudgetMonthDebtBulkRowDto,
  PatchBudgetMonthDebtRequestDto,
  PatchBudgetMonthDebtsBulkRequestDto,
  PatchBudgetMonthIncomeItemBulkRowDto,
  PatchBudgetMonthIncomeItemRequestDto,
  PatchBudgetMonthIncomeItemsBulkRequestDto,
  PatchBudgetMonthExpenseItemBulkRowDto,
  PatchBudgetMonthExpenseItemRequestDto,
  PatchBudgetMonthExpenseItemsBulkRequestDto,
  PatchBudgetMonthSavingsGoalBulkRowDto,
  PatchBudgetMonthSavingsGoalRequestDto,
  PatchBudgetMonthSavingsGoalsBulkRequestDto,
} from "@/types/budget/BudgetMonthsStatusDto";

export async function getBudgetMonthEditor(
  yearMonth: string,
): Promise<BudgetMonthEditorDto> {
  const res = await api.get<ApiEnvelope<BudgetMonthEditorDto>>(
    `/api/budgets/months/${yearMonth}/editor`,
    {
      headers: {
        "Cache-Control": "no-cache",
      },
    },
  );

  return unwrapEnvelopeData(res, "Could not load budget month editor.");
}

export async function patchBudgetMonthExpenseItem(
  yearMonth: string,
  monthExpenseItemId: string,
  payload: PatchBudgetMonthExpenseItemRequestDto,
): Promise<BudgetMonthExpenseItemEditorRowDto> {
  const res = await api.patch<ApiEnvelope<BudgetMonthExpenseItemEditorRowDto>>(
    `/api/budgets/months/${yearMonth}/expense-items/${monthExpenseItemId}`,
    payload,
  );

  return unwrapEnvelopeData(res, "Could not update month expense item.");
}

/**
 * Transactional bulk patch of budget-month expense items.
 * The backend wraps the entire request in a single UnitOfWork transaction:
 * either every row is applied or none are. The response array mirrors the
 * order of the input rows.
 */
export async function patchBudgetMonthExpenseItemsBulk(
  yearMonth: string,
  rows: PatchBudgetMonthExpenseItemBulkRowDto[],
): Promise<BudgetMonthExpenseItemEditorRowDto[]> {
  const payload: PatchBudgetMonthExpenseItemsBulkRequestDto = { items: rows };

  const res = await api.patch<
    ApiEnvelope<BudgetMonthExpenseItemEditorRowDto[]>
  >(`/api/budgets/months/${yearMonth}/expense-items`, payload);

  return unwrapEnvelopeData(res, "Could not update month expense items.");
}

export async function createBudgetMonthExpenseItem(
  yearMonth: string,
  payload: CreateBudgetMonthExpenseItemRequestDto,
): Promise<BudgetMonthExpenseItemEditorRowDto> {
  const res = await api.post<ApiEnvelope<BudgetMonthExpenseItemEditorRowDto>>(
    `/api/budgets/months/${yearMonth}/expense-items`,
    payload,
  );

  return unwrapEnvelopeData(res, "Could not create month expense item.");
}

export async function deleteBudgetMonthExpenseItem(
  yearMonth: string,
  monthExpenseItemId: string,
): Promise<void> {
  const res = await api.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/api/budgets/months/${yearMonth}/expense-items/${monthExpenseItemId}`,
  );

  unwrapEnvelopeData(res, "Could not delete month expense item.");
}

export async function getBudgetMonthIncomeItems(
  yearMonth: string,
): Promise<BudgetMonthIncomeItemEditorRowDto[]> {
  const res = await api.get<
    ApiEnvelope<BudgetMonthIncomeItemEditorRowDto[]>
  >(`/api/budgets/months/${yearMonth}/income-items`, {
    headers: {
      "Cache-Control": "no-cache",
    },
  });

  return unwrapEnvelopeData(res, "Could not load month income items.");
}

export async function patchBudgetMonthIncomeItem(
  yearMonth: string,
  monthIncomeItemId: string,
  payload: PatchBudgetMonthIncomeItemRequestDto,
): Promise<BudgetMonthIncomeItemEditorRowDto> {
  const res = await api.patch<
    ApiEnvelope<BudgetMonthIncomeItemEditorRowDto>
  >(`/api/budgets/months/${yearMonth}/income-items/${monthIncomeItemId}`, payload);

  return unwrapEnvelopeData(res, "Could not update month income item.");
}

export async function patchBudgetMonthIncomeItemsBulk(
  yearMonth: string,
  rows: PatchBudgetMonthIncomeItemBulkRowDto[],
): Promise<BudgetMonthIncomeItemEditorRowDto[]> {
  const payload: PatchBudgetMonthIncomeItemsBulkRequestDto = { items: rows };

  const res = await api.patch<
    ApiEnvelope<BudgetMonthIncomeItemEditorRowDto[]>
  >(`/api/budgets/months/${yearMonth}/income-items`, payload);

  return unwrapEnvelopeData(res, "Could not update month income items.");
}

export async function createBudgetMonthIncomeItem(
  yearMonth: string,
  payload: CreateBudgetMonthIncomeItemRequestDto,
): Promise<BudgetMonthIncomeItemEditorRowDto> {
  const res = await api.post<
    ApiEnvelope<BudgetMonthIncomeItemEditorRowDto>
  >(`/api/budgets/months/${yearMonth}/income-items`, payload);

  return unwrapEnvelopeData(res, "Could not create month income item.");
}

export async function deleteBudgetMonthIncomeItem(
  yearMonth: string,
  monthIncomeItemId: string,
): Promise<void> {
  const res = await api.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/api/budgets/months/${yearMonth}/income-items/${monthIncomeItemId}`,
  );

  unwrapEnvelopeData(res, "Could not delete month income item.");
}

export async function getBudgetMonthSavingsGoals(
  yearMonth: string,
): Promise<BudgetMonthSavingsGoalEditorRowDto[]> {
  const res = await api.get<
    ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto[]>
  >(`/api/budgets/months/${yearMonth}/savings-goals`, {
    headers: {
      "Cache-Control": "no-cache",
    },
  });

  return unwrapEnvelopeData(res, "Could not load month savings goals.");
}

export async function getBudgetMonthSavingsOldGoals(
  yearMonth: string,
): Promise<BudgetMonthSavingsGoalArchiveRowDto[]> {
  const res = await api.get<
    ApiEnvelope<BudgetMonthSavingsGoalArchiveRowDto[]>
  >(`/api/budgets/months/${yearMonth}/savings-goals/old`, {
    headers: {
      "Cache-Control": "no-cache",
    },
  });

  return unwrapEnvelopeData(
    res,
    "Could not load previous month savings goals.",
  );
}

export async function getBudgetMonthSavingsMethods(
  yearMonth: string,
): Promise<SavingsMethodDto[]> {
  const res = await api.get<ApiEnvelope<SavingsMethodDto[]>>(
    `/api/budgets/months/${yearMonth}/savings-methods`,
    {
      headers: {
        "Cache-Control": "no-cache",
      },
    },
  );

  return unwrapEnvelopeData(res, "Could not load month savings methods.");
}

export async function addBudgetMonthSavingsMethod(
  yearMonth: string,
  payload: { code: SavingsMethodCode; customLabel?: string | null },
): Promise<SavingsMethodDto> {
  const res = await api.post<ApiEnvelope<SavingsMethodDto>>(
    `/api/budgets/months/${yearMonth}/savings-methods`,
    payload,
  );

  return unwrapEnvelopeData(res, "Could not add savings method.");
}

export async function removeBudgetMonthSavingsMethod(
  yearMonth: string,
  savingsMethodId: string,
): Promise<void> {
  const res = await api.delete<ApiEnvelope<unknown>>(
    `/api/budgets/months/${yearMonth}/savings-methods/${savingsMethodId}`,
  );

  unwrapEnvelopeData(res, "Could not remove savings method.");
}

export async function patchBudgetMonthSavingsGoal(
  yearMonth: string,
  monthSavingsGoalId: string,
  payload: PatchBudgetMonthSavingsGoalRequestDto,
): Promise<BudgetMonthSavingsGoalEditorRowDto> {
  const res = await api.patch<
    ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>
  >(
    `/api/budgets/months/${yearMonth}/savings-goals/${monthSavingsGoalId}`,
    payload,
  );

  return unwrapEnvelopeData(res, "Could not update month savings goal.");
}

export async function createBudgetMonthSavingsGoal(
  yearMonth: string,
  payload: CreateBudgetMonthSavingsGoalRequestDto,
): Promise<BudgetMonthSavingsGoalEditorRowDto> {
  const res = await api.post<
    ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>
  >(`/api/budgets/months/${yearMonth}/savings-goals`, payload);

  return unwrapEnvelopeData(res, "Could not create month savings goal.");
}

/**
 * Transactional bulk patch. Sends one PATCH request to
 * `/api/budgets/months/{yearMonth}/savings-goals`; the backend either applies
 * every row or rolls back the whole transaction.
 */
export async function patchBudgetMonthSavingsGoalsBulk(
  yearMonth: string,
  rows: PatchBudgetMonthSavingsGoalBulkRowDto[],
): Promise<BudgetMonthSavingsGoalEditorRowDto[]> {
  const payload: PatchBudgetMonthSavingsGoalsBulkRequestDto = { items: rows };

  const res = await api.patch<
    ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto[]>
  >(`/api/budgets/months/${yearMonth}/savings-goals`, payload);

  return unwrapEnvelopeData(res, "Could not update month savings goals.");
}

export async function completeBudgetMonthSavingsGoal(
  yearMonth: string,
  monthSavingsGoalId: string,
): Promise<BudgetMonthSavingsGoalEditorRowDto> {
  const res = await api.post<
    ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>
  >(
    `/api/budgets/months/${yearMonth}/savings-goals/${monthSavingsGoalId}/complete`,
  );

  return unwrapEnvelopeData(res, "Could not complete savings goal.");
}

export async function cancelBudgetMonthSavingsGoal(
  yearMonth: string,
  monthSavingsGoalId: string,
): Promise<BudgetMonthSavingsGoalEditorRowDto> {
  const res = await api.post<
    ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>
  >(
    `/api/budgets/months/${yearMonth}/savings-goals/${monthSavingsGoalId}/cancel`,
  );

  return unwrapEnvelopeData(res, "Could not cancel savings goal.");
}

export async function patchBudgetMonthBaseSavings(
  yearMonth: string,
  payload: PatchBudgetMonthBaseSavingsRequestDto,
): Promise<BudgetMonthBaseSavingsEditorDto> {
  const res = await api.patch<ApiEnvelope<BudgetMonthBaseSavingsEditorDto>>(
    `/api/budgets/months/${yearMonth}/base-savings`,
    payload,
  );

  return unwrapEnvelopeData(res, "Could not update base savings.");
}

export async function removeBudgetMonthSavingsGoal(
  yearMonth: string,
  monthSavingsGoalId: string,
): Promise<BudgetMonthSavingsGoalEditorRowDto> {
  const res = await api.post<
    ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>
  >(
    `/api/budgets/months/${yearMonth}/savings-goals/${monthSavingsGoalId}/remove`,
  );

  return unwrapEnvelopeData(res, "Could not remove savings goal.");
}

export async function getBudgetMonthDebts(
  yearMonth: string,
): Promise<BudgetMonthDebtEditorRowDto[]> {
  const res = await api.get<
    ApiEnvelope<BudgetMonthDebtEditorRowDto[]>
  >(`/api/budgets/months/${yearMonth}/debt-items`, {
    headers: {
      "Cache-Control": "no-cache",
    },
  });

  return unwrapEnvelopeData(res, "Could not load month debts.");
}

export async function patchBudgetMonthDebt(
  yearMonth: string,
  monthDebtId: string,
  payload: PatchBudgetMonthDebtRequestDto,
): Promise<BudgetMonthDebtEditorRowDto> {
  const res = await api.patch<
    ApiEnvelope<BudgetMonthDebtEditorRowDto>
  >(`/api/budgets/months/${yearMonth}/debt-items/${monthDebtId}`, payload);

  return unwrapEnvelopeData(res, "Could not update month debt.");
}

/**
 * Transactional bulk patch. Sends one PATCH request to
 * `/api/budgets/months/{yearMonth}/debt-items`; the backend either applies
 * every row or rolls back the whole transaction.
 */
export async function patchBudgetMonthDebtsBulk(
  yearMonth: string,
  rows: PatchBudgetMonthDebtBulkRowDto[],
): Promise<BudgetMonthDebtEditorRowDto[]> {
  const payload: PatchBudgetMonthDebtsBulkRequestDto = { items: rows };

  const res = await api.patch<
    ApiEnvelope<BudgetMonthDebtEditorRowDto[]>
  >(`/api/budgets/months/${yearMonth}/debt-items`, payload);

  return unwrapEnvelopeData(res, "Could not update month debts.");
}
