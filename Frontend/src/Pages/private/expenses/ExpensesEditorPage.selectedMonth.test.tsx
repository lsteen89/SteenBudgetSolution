import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ExpensesEditorPage from "./ExpensesEditorPage";

// ---- Hook mocks (mirrors ExpensesEditorPage.scope.test.tsx) ---------------

const mockUseBudgetMonthEditor = vi.fn();
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
      totalIncome: 5000,
      totalExpenditure: 1300,
      remainingToSpend: 3700,
      header: { periodLabel: "May 2026" },
    },
  }),
}));

vi.mock("@/hooks/budget/useExpenseCategories", () => ({
  useExpenseCategories: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/budget/editPeriod/useMonthEditor", () => ({
  useBudgetMonthEditor: (...args: unknown[]) =>
    mockUseBudgetMonthEditor(...args),
  useCreateBudgetMonthExpenseItem: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePatchBudgetMonthExpenseItem: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteBudgetMonthExpenseItem: () => ({
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
  mockUseBudgetMonthEditor.mockReturnValue({
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
      <ExpensesEditorPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUseBudgetMonthsStatusQuery.mockReset();
  mockUseBudgetMonthEditor.mockReset();
  mockUseBudgetDashboardMonthQuery.mockReset();
  mockUseBudgetMonthsStatusQuery.mockReturnValue(monthsStatus());
});

describe("ExpensesEditorPage selected month", () => {
  it("defaults to the open month without a yearMonth param", () => {
    loadingQueries();

    renderAt("/dashboard/expenses");

    expect(mockUseBudgetMonthEditor).toHaveBeenCalledWith("2026-05", true);
    expect(
      screen.queryByTestId("selected-month-banner"),
    ).not.toBeInTheDocument();
  });

  it("targets a planned month from ?yearMonth and labels it", () => {
    loadingQueries();

    renderAt("/dashboard/expenses?yearMonth=2026-06");

    expect(mockUseBudgetMonthEditor).toHaveBeenCalledWith("2026-06", true);
    expect(screen.getByTestId("selected-month-banner")).toHaveAttribute(
      "data-month-status",
      "planned",
    );
  });

  it("targets a closed month read-only and labels it", () => {
    loadingQueries();

    renderAt("/dashboard/expenses?yearMonth=2026-04");

    expect(mockUseBudgetMonthEditor).toHaveBeenCalledWith("2026-04", true);
    expect(screen.getByTestId("selected-month-banner")).toHaveAttribute(
      "data-month-status",
      "closed",
    );
  });

  it("refuses an unknown month instead of silently editing the open month", () => {
    loadingQueries();

    renderAt("/dashboard/expenses?yearMonth=2099-01");

    expect(
      screen.getByText("The selected month does not exist in your budget."),
    ).toBeInTheDocument();
    expect(mockUseBudgetMonthEditor).toHaveBeenCalledWith(undefined, false);
  });

  it("shows the dashboard honesty panel instead of zero income/carry-over", () => {
    // Editor rows resolve but the dashboard aggregate errors: the balance
    // strip must not render with `Income 0 / Carry-over 0` fallbacks.
    mockUseBudgetMonthEditor.mockReturnValue({
      data: {
        month: {
          budgetMonthId: "bm-1",
          yearMonth: "2026-05",
          status: "open",
          isEditable: true,
          carryOverAmount: null,
          carryOverMode: "none",
        },
        rows: [],
      },
      isLoading: false,
      isError: false,
    });
    mockUseBudgetDashboardMonthQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    renderAt("/dashboard/expenses");

    expect(
      screen.getByTestId("expenses-dashboard-error"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("expenses-plan-balance-strip"),
    ).not.toBeInTheDocument();
  });
});
