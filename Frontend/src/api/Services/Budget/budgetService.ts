import type { ApiEnvelope } from "@/api/api.types";
import { api } from "@/api/axios";
import { unwrapEnvelopeData } from "@/api/envelope";
import type {
  BudgetMonthStatus,
  BudgetMonthsStatusDto,
} from "@/types/budget/BudgetMonthsStatusDto";
import type { ExpenseCategoryDto } from "@/types/budget/ExpenseCategoryDto";
import type { BudgetMonthRecapDto } from "@/types/budget/BudgetMonthRecapDto";
import type { SavingsGoalCompletionCandidateDto } from "@/types/budget/SavingsGoalCompletionCandidateDto";
import type { NextMonthPreviewDto } from "@/types/budget/NextMonthPreviewDto";
import type { BudgetDashboardMonthDto } from "@myTypes/budget/BudgetDashboardMonthDto";

export async function fetchBudgetMonthsStatus(): Promise<BudgetMonthsStatusDto> {
  const res = await api.get<ApiEnvelope<BudgetMonthsStatusDto>>(
    "/api/budgets/months/status",
  );

  return unwrapEnvelopeData(res, "Could not load budget months status.");
}

export type StartBudgetMonthRequestDto = {
  targetYearMonth: string;
  closePreviousOpenMonth: boolean;
  carryOverMode: "none" | "full" | "custom";
  carryOverAmount: number;
  createSkippedMonths: boolean;
};

export async function startBudgetMonth(
  req: StartBudgetMonthRequestDto,
): Promise<BudgetMonthsStatusDto> {
  const res = await api.post<ApiEnvelope<BudgetMonthsStatusDto>>(
    "/api/budgets/months/start",
    req,
  );

  return unwrapEnvelopeData(res, "Could not start budget month.");
}

export type CloseBudgetMonthCarryOverMode = "none" | "full";

export type CloseBudgetMonthRequestDto = {
  carryOverMode: CloseBudgetMonthCarryOverMode;
  completedSavingsGoalIds?: string[];
};

export type CloseBudgetMonthClosedMonthDto = {
  yearMonth: string;
  status: BudgetMonthStatus;
  closedAtUtc: string | null;
};

export type CloseBudgetMonthNextMonthDto = {
  yearMonth: string;
  status: BudgetMonthStatus;
  carryOverMode: CloseBudgetMonthCarryOverMode;
  carryOverAmount: number | null;
};

export type CloseBudgetMonthResultDto = {
  closedMonth: CloseBudgetMonthClosedMonthDto;
  snapshotTotals: NonNullable<BudgetDashboardMonthDto["snapshotTotals"]>;
  nextMonth: CloseBudgetMonthNextMonthDto;
};

export async function closeBudgetMonth(
  yearMonth: string,
  req: CloseBudgetMonthRequestDto,
): Promise<CloseBudgetMonthResultDto> {
  const res = await api.post<ApiEnvelope<CloseBudgetMonthResultDto>>(
    `/api/budgets/months/${encodeURIComponent(yearMonth)}/close`,
    req,
  );

  return unwrapEnvelopeData(res, "Could not close budget month.");
}

export async function fetchBudgetDashboardMonth(
  yearMonth?: string,
): Promise<BudgetDashboardMonthDto> {
  const qs = yearMonth ? `?yearMonth=${encodeURIComponent(yearMonth)}` : "";
  const res = await api.get<ApiEnvelope<BudgetDashboardMonthDto>>(
    `/api/budgets/dashboard${qs}`,
  );

  return unwrapEnvelopeData(res, "Could not load budget dashboard.");
}

// Read-only next-month preview projected from the budget plan. The backend
// guarantees this never inserts or materialises a BudgetMonth. A non-open
// from-month comes back as `state: "unavailable"` (a successful envelope with
// `dashboard: null`) rather than a failure — only an invalid year-month fails.
export async function fetchNextMonthPreview(
  fromYearMonth: string,
): Promise<NextMonthPreviewDto> {
  const res = await api.get<ApiEnvelope<NextMonthPreviewDto>>(
    `/api/budgets/months/${encodeURIComponent(fromYearMonth)}/next-preview`,
  );

  return unwrapEnvelopeData(res, "Could not load next-month preview.");
}

export async function fetchBudgetMonthRecap(
  yearMonth: string,
): Promise<BudgetMonthRecapDto> {
  const res = await api.get<ApiEnvelope<BudgetMonthRecapDto>>(
    `/api/budgets/months/${encodeURIComponent(yearMonth)}/recap`,
  );

  return unwrapEnvelopeData(res, "Could not load budget month recap.");
}

export async function fetchSavingsGoalCompletionCandidates(
  yearMonth: string,
): Promise<SavingsGoalCompletionCandidateDto[]> {
  const res = await api.get<ApiEnvelope<SavingsGoalCompletionCandidateDto[]>>(
    `/api/budgets/months/${encodeURIComponent(yearMonth)}/close/savings-goal-completion-candidates`,
  );

  return unwrapEnvelopeData(
    res,
    "Could not load savings goal completion candidates.",
  );
}

export async function fetchExpenseCategories(): Promise<ExpenseCategoryDto[]> {
  const res = await api.get<ApiEnvelope<ExpenseCategoryDto[]>>(
    "/api/budgets/expense-categories",
  );

  return unwrapEnvelopeData(res, "Could not load expense categories.");
}
