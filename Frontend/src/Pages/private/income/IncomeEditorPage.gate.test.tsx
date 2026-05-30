import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import IncomeEditorPage from "./IncomeEditorPage";

// ---- Hook mocks ---------------------------------------------------------

const mockUseBudgetMonthsStatusQuery = vi.fn();
const mockUseBudgetMonthIncomeItems = vi.fn();
const mockUseBudgetDashboardMonthQuery = vi.fn();
const mockBuildDashboardSummaryAggregate = vi.fn();

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
  buildDashboardSummaryAggregate: (...args: unknown[]) =>
    mockBuildDashboardSummaryAggregate(...args),
}));

// `vi.mock` factories are hoisted above any module-scope `const`s, so the
// no-op mutation factory has to be defined inline here rather than as a
// shared constant.
vi.mock("@/hooks/budget/editPeriod/useMonthEditor", () => ({
  useBudgetMonthIncomeItems: (...args: unknown[]) =>
    mockUseBudgetMonthIncomeItems(...args),
  useCreateBudgetMonthIncomeItem: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePatchBudgetMonthIncomeItem: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteBudgetMonthIncomeItem: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

const editableYearMonth = "2026-05";

function statusForOpenMonth() {
  return {
    data: {
      openMonthYearMonth: editableYearMonth,
      currentYearMonth: editableYearMonth,
      gapMonthsCount: 0,
      months: [
        {
          yearMonth: editableYearMonth,
          status: "open" as const,
          openedAt: "2026-05-01T00:00:00Z",
          closedAt: null,
        },
      ],
      suggestedAction: "none" as const,
    },
    isLoading: false,
    isError: false,
  };
}

function incomeRowsLoaded() {
  return {
    data: [
      {
        id: "row-salary",
        sourceIncomeItemId: "src-salary",
        kind: "salary" as const,
        name: "Net salary",
        amountMonthly: 30000,
        isActive: true,
        isDeleted: false,
        isMonthOnly: false,
        canUpdateDefault: false,
        sourceName: null,
        sourceAmountMonthly: null,
        sourceIsActive: null,
      },
    ],
    isLoading: false,
    isError: false,
  };
}

beforeEach(() => {
  mockUseBudgetMonthsStatusQuery.mockReset();
  mockUseBudgetMonthIncomeItems.mockReset();
  mockUseBudgetDashboardMonthQuery.mockReset();
  mockBuildDashboardSummaryAggregate.mockReset();
});

describe("IncomeEditorPage honesty gates", () => {
  it("renders the calm error panel when the dashboard query errors", () => {
    // Income rows load fine; dashboard endpoint errors. The page must NOT
    // render hero/strip from `?? 0` fallbacks — that would invent the
    // expenses/savings/debts/carry-over terms and inflate `Fritt kvar`.
    mockUseBudgetMonthsStatusQuery.mockReturnValue(statusForOpenMonth());
    mockUseBudgetMonthIncomeItems.mockReturnValue(incomeRowsLoaded());
    mockUseBudgetDashboardMonthQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(<IncomeEditorPage />);

    expect(screen.getByTestId("income-editor-error")).toBeInTheDocument();
    expect(screen.queryByTestId("income-soul-hero")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("income-distribution-strip"),
    ).not.toBeInTheDocument();
    // Aggregate must never have been built from undefined data.
    expect(mockBuildDashboardSummaryAggregate).not.toHaveBeenCalled();
  });

  it("renders the calm error panel when the dashboard returns no aggregate", () => {
    // Dashboard query "succeeds" with undefined data (e.g. stale cache miss).
    // The aggregate would be null; rendering with fallback zeros would still
    // fake the equation, so the gate must catch this case too.
    mockUseBudgetMonthsStatusQuery.mockReturnValue(statusForOpenMonth());
    mockUseBudgetMonthIncomeItems.mockReturnValue(incomeRowsLoaded());
    mockUseBudgetDashboardMonthQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    render(<IncomeEditorPage />);

    expect(screen.getByTestId("income-editor-error")).toBeInTheDocument();
    expect(screen.queryByTestId("income-soul-hero")).not.toBeInTheDocument();
  });

  it("renders hero + strip when income rows and the dashboard aggregate are both real", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue(statusForOpenMonth());
    mockUseBudgetMonthIncomeItems.mockReturnValue(incomeRowsLoaded());
    mockUseBudgetDashboardMonthQuery.mockReturnValue({
      data: { month: { status: "open", yearMonth: editableYearMonth } },
      isLoading: false,
      isError: false,
    });
    mockBuildDashboardSummaryAggregate.mockReturnValue({
      summary: {
        header: { periodLabel: "May 2026" },
        currency: "SEK",
        totalIncome: 30000,
        totalExpenditure: 12000,
        incomingCarryOverAmount: 500,
        totalSavings: 4000,
        totalDebtPayments: 2000,
        finalBalance: 12500,
      },
    });

    render(<IncomeEditorPage />);

    expect(screen.getByTestId("income-soul-hero")).toBeInTheDocument();
    expect(
      screen.getByTestId("income-distribution-strip"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("income-editor-error"),
    ).not.toBeInTheDocument();
  });
});
