import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SavingsEditorPage from "./SavingsEditorPage";

// ---- Hook mocks (mirrors SavingsEditorPage.create.test.tsx) ---------------

const mockSavingsQuery = vi.fn();
const mockUseBudgetMonthsStatusQuery = vi.fn();
const mockUseBudgetDashboardMonthQuery = vi.fn();

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en",
}));

vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
}));

vi.mock("@/ui/toast/toast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/hooks/budget/useBudgetMonthsStatusQuery", () => ({
  useBudgetMonthsStatusQuery: () => mockUseBudgetMonthsStatusQuery(),
}));

vi.mock("@/hooks/budget/useBudgetDashboardMonthQuery", () => ({
  useBudgetDashboardMonthQuery: (...args: unknown[]) =>
    mockUseBudgetDashboardMonthQuery(...args),
}));

vi.mock("@/hooks/dashboard/buildDashboardSummaryAggregate", () => ({
  buildDashboardSummaryAggregate: () => ({
    summary: {
      header: { periodLabel: "May 2026" },
      habitSavings: 0,
      totalIncome: 0,
      totalExpenditure: 0,
      totalDebtPayments: 0,
      incomingCarryOverAmount: 0,
      currency: "SEK",
    },
  }),
}));

vi.mock("@/hooks/budget/editPeriod/useMonthEditor", () => ({
  useBudgetMonthSavingsGoals: (...args: unknown[]) =>
    mockSavingsQuery(...args),
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
  useAddBudgetMonthSavingsMethod: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRemoveBudgetMonthSavingsMethod: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePatchBudgetMonthBaseSavings: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useTransferBudgetMonthSavingsGoalMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRenameBudgetMonthSavingsGoalMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useChangeBudgetMonthSavingsGoalTargetAmountMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

function monthsStatus() {
  return {
    data: {
      openMonthYearMonth: "2026-05",
      currentYearMonth: "2026-05",
      gapMonthsCount: 0,
      months: [
        {
          yearMonth: "2026-06",
          status: "planned" as const,
          openedAt: "2026-05-10T00:00:00Z",
          closedAt: null,
        },
        {
          yearMonth: "2026-05",
          status: "open" as const,
          openedAt: "2026-05-01T00:00:00Z",
          closedAt: null,
        },
        {
          yearMonth: "2026-04",
          status: "closed" as const,
          openedAt: "2026-04-01T00:00:00Z",
          closedAt: "2026-04-30T00:00:00Z",
        },
      ],
      suggestedAction: "none" as const,
    },
    isLoading: false,
    isError: false,
  };
}

function loadingQueries() {
  mockSavingsQuery.mockReturnValue({
    data: undefined,
    isLoading: true,
    isError: false,
  });
  mockUseBudgetDashboardMonthQuery.mockReturnValue({
    data: undefined,
    isLoading: true,
    isError: false,
  });
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <SavingsEditorPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUseBudgetMonthsStatusQuery.mockReset();
  mockSavingsQuery.mockReset();
  mockUseBudgetDashboardMonthQuery.mockReset();
  mockUseBudgetMonthsStatusQuery.mockReturnValue(monthsStatus());
});

describe("SavingsEditorPage selected month", () => {
  it("defaults to the open month without a yearMonth param", () => {
    loadingQueries();

    renderAt("/dashboard/savings");

    expect(mockSavingsQuery).toHaveBeenCalledWith("2026-05", true);
    expect(
      screen.queryByTestId("selected-month-banner"),
    ).not.toBeInTheDocument();
  });

  it("targets a planned month from ?yearMonth and labels it", () => {
    loadingQueries();

    renderAt("/dashboard/savings?yearMonth=2026-06");

    expect(mockSavingsQuery).toHaveBeenCalledWith("2026-06", true);
    expect(screen.getByTestId("selected-month-banner")).toHaveAttribute(
      "data-month-status",
      "planned",
    );
  });

  it("targets a closed month read-only and labels it", () => {
    loadingQueries();

    renderAt("/dashboard/savings?yearMonth=2026-04");

    expect(mockSavingsQuery).toHaveBeenCalledWith("2026-04", true);
    expect(screen.getByTestId("selected-month-banner")).toHaveAttribute(
      "data-month-status",
      "closed",
    );
  });

  it("refuses an unknown month instead of silently editing the open month", () => {
    loadingQueries();

    renderAt("/dashboard/savings?yearMonth=2099-01");

    expect(
      screen.getByText("The selected month does not exist in your budget."),
    ).toBeInTheDocument();
    expect(mockSavingsQuery).toHaveBeenCalledWith(undefined, false);
  });

  it("shows the loading panel instead of zero base savings while data resolves", () => {
    loadingQueries();

    renderAt("/dashboard/savings?yearMonth=2026-06");

    // Honesty gate: no hero / base habit row built from `0 kr` fallbacks.
    expect(screen.getByTestId("savings-editor-loading")).toBeInTheDocument();
    expect(
      screen.queryByTestId("savings-goal-add-placeholder"),
    ).not.toBeInTheDocument();
  });

  it("shows the error panel when the dashboard aggregate is unavailable", () => {
    mockSavingsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    mockUseBudgetDashboardMonthQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    renderAt("/dashboard/savings");

    expect(screen.getByTestId("savings-editor-error")).toBeInTheDocument();
  });
});
