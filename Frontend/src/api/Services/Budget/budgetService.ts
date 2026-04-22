import type { ApiEnvelope } from "@/api/api.types";
import { api } from "@/api/axios";
import { unwrapEnvelopeData } from "@/api/envelope";
import type {
  BudgetMonthStatus,
  BudgetMonthsStatusDto,
} from "@/types/budget/BudgetMonthsStatusDto";
import type { ExpenseCategoryDto } from "@/types/budget/ExpenseCategoryDto";
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

export async function fetchExpenseCategories(): Promise<ExpenseCategoryDto[]> {
  const res = await api.get<ApiEnvelope<ExpenseCategoryDto[]>>(
    "/api/budgets/expense-categories",
  );

  return unwrapEnvelopeData(res, "Could not load expense categories.");
}
