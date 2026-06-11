import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import IncomeEditorPage from "./IncomeEditorPage";

// ---- Hook mocks (mirrors IncomeEditorPage.gate.test.tsx) -----------------

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
  mockUseBudgetMonthIncomeItems.mockReturnValue({
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
      <IncomeEditorPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUseBudgetMonthsStatusQuery.mockReset();
  mockUseBudgetMonthIncomeItems.mockReset();
  mockUseBudgetDashboardMonthQuery.mockReset();
  mockBuildDashboardSummaryAggregate.mockReset();
  mockUseBudgetMonthsStatusQuery.mockReturnValue(monthsStatus());
});

describe("IncomeEditorPage selected month", () => {
  it("defaults to the open month without a yearMonth param", () => {
    loadingQueries();

    renderAt("/dashboard/income");

    expect(mockUseBudgetMonthIncomeItems).toHaveBeenCalledWith(
      "2026-05",
      true,
    );
    // Editing the open month is the everyday case — no banner noise.
    expect(
      screen.queryByTestId("selected-month-banner"),
    ).not.toBeInTheDocument();
  });

  it("targets a planned month from ?yearMonth and labels it", () => {
    loadingQueries();

    renderAt("/dashboard/income?yearMonth=2026-06");

    // Reads (and therefore the mutation hooks keyed off the same value)
    // target the selected planned month, not the open month.
    expect(mockUseBudgetMonthIncomeItems).toHaveBeenCalledWith(
      "2026-06",
      true,
    );

    const banner = screen.getByTestId("selected-month-banner");
    expect(banner).toHaveAttribute("data-month-status", "planned");
  });

  it("targets a closed month read-only and labels it", () => {
    loadingQueries();

    renderAt("/dashboard/income?yearMonth=2026-04");

    expect(mockUseBudgetMonthIncomeItems).toHaveBeenCalledWith(
      "2026-04",
      true,
    );

    const banner = screen.getByTestId("selected-month-banner");
    expect(banner).toHaveAttribute("data-month-status", "closed");
  });

  it("refuses an unknown month instead of silently editing the open month", () => {
    loadingQueries();

    renderAt("/dashboard/income?yearMonth=2099-01");

    expect(
      screen.getByText("The selected month does not exist in your budget."),
    ).toBeInTheDocument();
    // The income query must not have been enabled for any month.
    expect(mockUseBudgetMonthIncomeItems).toHaveBeenCalledWith(
      undefined,
      false,
    );
  });
});
