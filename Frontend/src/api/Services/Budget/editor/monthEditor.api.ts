import type { ApiEnvelope } from "@/api/api.types";
import { api } from "@/api/axios";
import { unwrapEnvelopeData } from "@/api/envelope";
import type {
  BudgetMonthEditorDto,
  BudgetMonthIncomeItemEditorRowDto,
  BudgetMonthExpenseItemEditorRowDto,
  CreateBudgetMonthIncomeItemRequestDto,
  CreateBudgetMonthExpenseItemRequestDto,
  PatchBudgetMonthIncomeItemBulkRowDto,
  PatchBudgetMonthIncomeItemRequestDto,
  PatchBudgetMonthIncomeItemsBulkRequestDto,
  PatchBudgetMonthExpenseItemBulkRowDto,
  PatchBudgetMonthExpenseItemRequestDto,
  PatchBudgetMonthExpenseItemsBulkRequestDto,
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
