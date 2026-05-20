import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCloseMonthReviewController } from "./useCloseMonthReviewController";
import type { DashboardSummary } from "./dashboardSummary.types";
import type { SavingsGoalCompletionCandidateDto } from "@/types/budget/SavingsGoalCompletionCandidateDto";

const mockCloseBudgetMonth = vi.fn();
const mockFetchCandidates = vi.fn();

vi.mock("@/api/Services/Budget/budgetService", () => ({
  closeBudgetMonth: (...args: unknown[]) => mockCloseBudgetMonth(...args),
  fetchSavingsGoalCompletionCandidates: (...args: unknown[]) =>
    mockFetchCandidates(...args),
  fetchBudgetMonthsStatus: vi.fn(),
  fetchBudgetDashboardMonth: vi.fn(),
  fetchBudgetMonthRecap: vi.fn(),
}));

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en",
}));

vi.mock("@/ui/toast/toast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/stores/Budget/budgetMonthStore", () => ({
  useBudgetMonthStore: (selector: (s: { setSelectedYearMonth: (ym: string | null) => void }) => unknown) =>
    selector({ setSelectedYearMonth: vi.fn() }),
}));

const baseSummary: DashboardSummary = {
  remainingToSpend: 0,
} as DashboardSummary;

function buildWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

const candidate: SavingsGoalCompletionCandidateDto = {
  id: "goal-a",
  sourceSavingsGoalId: "src-a",
  name: "Buffert",
  targetAmount: 10000,
  amountSaved: 9500,
  monthlyContribution: 500,
  projectedAmountSaved: 10000,
  remainingAfterContribution: 0,
};

const closeResult = {
  closedMonth: {
    yearMonth: "2026-04",
    status: "closed" as const,
    closedAtUtc: "2026-04-30T00:00:00Z",
  },
  snapshotTotals: {
    totalIncomeMonthly: 0,
    totalExpensesMonthly: 0,
    totalSavingsMonthly: 0,
    totalDebtPaymentsMonthly: 0,
    finalBalanceMonthly: 0,
  },
  nextMonth: {
    yearMonth: "2026-05",
    status: "open" as const,
    carryOverMode: "none" as const,
    carryOverAmount: null,
  },
};

describe("useCloseMonthReviewController — savings goal completion", () => {
  beforeEach(() => {
    mockCloseBudgetMonth.mockReset();
    mockFetchCandidates.mockReset();
  });

  it("sends selected candidate IDs in the closeBudgetMonth request", async () => {
    mockFetchCandidates.mockResolvedValue([candidate]);
    mockCloseBudgetMonth.mockResolvedValue(closeResult);

    const wrapper = buildWrapper();
    const { result } = renderHook(
      () =>
        useCloseMonthReviewController({
          yearMonth: "2026-04",
          summary: baseSummary,
        }),
      { wrapper },
    );

    act(() => {
      result.current.open();
    });

    await waitFor(() => {
      expect(result.current.completionCandidates).toHaveLength(1);
    });

    act(() => {
      result.current.toggleCompletionGoal(candidate.id);
    });

    await act(async () => {
      await result.current.confirm();
    });

    expect(mockCloseBudgetMonth).toHaveBeenCalledTimes(1);
    expect(mockCloseBudgetMonth).toHaveBeenCalledWith("2026-04", {
      carryOverMode: "none",
      completedSavingsGoalIds: [candidate.id],
    });
  });

  it("omits completedSavingsGoalIds when no candidate is selected", async () => {
    mockFetchCandidates.mockResolvedValue([candidate]);
    mockCloseBudgetMonth.mockResolvedValue(closeResult);

    const wrapper = buildWrapper();
    const { result } = renderHook(
      () =>
        useCloseMonthReviewController({
          yearMonth: "2026-04",
          summary: baseSummary,
        }),
      { wrapper },
    );

    act(() => {
      result.current.open();
    });

    await waitFor(() => {
      expect(result.current.completionCandidates).toHaveLength(1);
    });

    await act(async () => {
      await result.current.confirm();
    });

    expect(mockCloseBudgetMonth).toHaveBeenCalledWith("2026-04", {
      carryOverMode: "none",
    });
  });
});
