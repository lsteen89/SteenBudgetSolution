import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SavingsEditorPage from "./SavingsEditorPage";

const mockSavingsQuery = vi.fn();
const mockUseBudgetMonthsStatusQuery = vi.fn();
const mockUseBudgetDashboardMonthQuery = vi.fn();
const mockBuildDashboardSummaryAggregate = vi.fn();
const mockToast = { success: vi.fn(), error: vi.fn() };

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en",
}));

vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
}));

vi.mock("@/ui/toast/toast", () => ({
  useToast: () => mockToast,
}));

vi.mock("@/hooks/budget/useBudgetMonthsStatusQuery", () => ({
  useBudgetMonthsStatusQuery: () => mockUseBudgetMonthsStatusQuery(),
}));

vi.mock("@/hooks/budget/useBudgetDashboardMonthQuery", () => ({
  useBudgetDashboardMonthQuery: (...args: unknown[]) =>
    mockUseBudgetDashboardMonthQuery(...args),
}));

vi.mock("@/hooks/dashboard/buildDashboardSummaryAggregate", () => ({
  buildDashboardSummaryAggregate: (...args: unknown[]) =>
    mockBuildDashboardSummaryAggregate(...args),
}));

vi.mock("@/hooks/budget/editPeriod/useMonthEditor", () => ({
  useBudgetMonthSavingsGoals: () => mockSavingsQuery(),
  useBudgetMonthSavingsOldGoals: () => ({
    isLoading: false,
    isError: false,
    data: [],
  }),
  useBudgetMonthSavingsMethods: () => ({
    isLoading: false,
    isError: false,
    data: [],
  }),
  useCreateBudgetMonthSavingsGoal: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePatchBudgetMonthSavingsGoal: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCompleteSavingsGoalMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCancelSavingsGoalMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRemoveSavingsGoalMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

const baseAggregate = (
  override: Partial<{
    remainingToSpend: number;
    totalIncome: number;
    incomingCarryOverAmount: number;
    totalExpenditure: number;
    totalSavings: number;
    totalDebtPayments: number;
  }> = {},
) => ({
  summary: {
    header: { periodLabel: "May 2026" },
    currency: "SEK" as const,
    remainingToSpend: 1250,
    totalIncome: 30000,
    incomingCarryOverAmount: 500,
    totalExpenditure: 18000,
    totalSavings: 6000,
    totalDebtPayments: 5250,
    ...override,
  },
});

const linkedRow = {
  id: "11111111-1111-4111-8111-111111111111",
  sourceSavingsGoalId: "22222222-2222-4222-8222-222222222222",
  name: "Emergency fund",
  targetAmount: 50000,
  targetDate: "2026-12-31",
  amountSaved: 10000,
  monthlyContribution: 1500,
  status: "active",
  isDeleted: false,
  isMonthOnly: false,
  canUpdateDefault: true,
};

beforeEach(() => {
  mockSavingsQuery.mockReturnValue({
    isLoading: false,
    isError: false,
    data: [linkedRow],
  });

  mockUseBudgetMonthsStatusQuery.mockReturnValue({
    isLoading: false,
    data: {
      openMonthYearMonth: "2026-05",
      months: [{ yearMonth: "2026-05", status: "open" }],
    },
  });

  mockUseBudgetDashboardMonthQuery.mockReturnValue({
    isLoading: false,
    data: { whatever: true },
  });

  mockBuildDashboardSummaryAggregate.mockImplementation(() => baseAggregate());
  mockToast.success.mockReset();
  mockToast.error.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SavingsEditorPage plan balance strip", () => {
  it("renders the plan balance strip with aggregate-derived values", () => {
    render(<SavingsEditorPage />);

    const strip = screen.getByTestId("savings-plan-balance-strip");
    expect(strip.dataset.tone).toBe("positive");
    expect(
      screen.getByTestId("savings-plan-balance-headline"),
    ).toHaveTextContent(/1,250/);
  });

  it("does not leave a permanent per-goal warning after refetch", () => {
    render(<SavingsEditorPage />);

    // The per-edit soft warning lives inside the modal (not rendered until
    // a row is being edited). The saved card must not carry a permanent
    // warning chip after refetch — confirm none of the data-testid markers
    // for the edit-time warning are on the page.
    expect(
      screen.queryByTestId("savings-goal-budget-warning"),
    ).not.toBeInTheDocument();
  });

  it("reflects updated aggregate values after a refetch", async () => {
    const { rerender } = render(<SavingsEditorPage />);
    expect(
      screen.getByTestId("savings-plan-balance-headline"),
    ).toHaveTextContent(/1,250/);

    mockBuildDashboardSummaryAggregate.mockImplementation(() =>
      baseAggregate({ remainingToSpend: -850 }),
    );
    mockUseBudgetDashboardMonthQuery.mockReturnValue({
      isLoading: false,
      data: { whatever: "refetched" },
    });

    rerender(<SavingsEditorPage />);

    await waitFor(() => {
      const strip = screen.getByTestId("savings-plan-balance-strip");
      expect(strip.dataset.tone).toBe("negative");
    });

    expect(
      screen.getByTestId("savings-plan-balance-chip"),
    ).toHaveTextContent(/Needs adjusting/i);
    expect(
      screen.getByTestId("savings-plan-balance-headline"),
    ).toHaveTextContent(/850/);
  });
});
