import type { ApiEnvelope } from "@/api/api.types";
import { api } from "@/api/axios";
import { unwrapEnvelopeData } from "@/api/envelope";
import type { BudgetMonthsStatusDto } from "@myTypes//budget/BudgetMonthsStatusDto";
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

export async function fetchBudgetDashboardMonth(
  yearMonth?: string,
): Promise<BudgetDashboardMonthDto> {
  const qs = yearMonth ? `?yearMonth=${encodeURIComponent(yearMonth)}` : "";
  const res = await api.get<ApiEnvelope<BudgetDashboardMonthDto>>(
    `/api/budgets/dashboard${qs}`,
  );

  return unwrapEnvelopeData(res, "Could not load budget dashboard.");
}
