import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DebtsEditorPage from "./DebtsEditorPage";

// ---- Hook mocks ------------------------------------------------------------

const mockUseBudgetMonthDebtEditor = vi.fn();
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
      remainingToSpend: 0,
    },
  }),
}));

vi.mock("@/hooks/budget/editPeriod/useMonthEditor", () => ({
  useBudgetMonthDebtEditor: (...args: unknown[]) =>
    mockUseBudgetMonthDebtEditor(...args),
  useAdjustBudgetMonthDebtBalance: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useArchiveBudgetMonthDebt: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCreateBudgetMonthDebt: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useMarkBudgetMonthDebtPaidOff: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePatchBudgetMonthDebt: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePatchBudgetMonthDebtDetails: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRemoveBudgetMonthDebt: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRestoreBudgetMonthDebt: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useSetBudgetMonthDebtParticipation: () => ({
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
  mockUseBudgetMonthDebtEditor.mockReturnValue({
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
      <DebtsEditorPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUseBudgetMonthsStatusQuery.mockReset();
  mockUseBudgetMonthDebtEditor.mockReset();
  mockUseBudgetDashboardMonthQuery.mockReset();
  mockUseBudgetMonthsStatusQuery.mockReturnValue(monthsStatus());
});

describe("DebtsEditorPage selected month", () => {
  it("defaults to the open month without a yearMonth param", () => {
    loadingQueries();

    renderAt("/dashboard/debts");

    expect(mockUseBudgetMonthDebtEditor).toHaveBeenCalledWith(
      "2026-05",
      true,
    );
  });

  it("targets a planned month from ?yearMonth", () => {
    loadingQueries();

    renderAt("/dashboard/debts?yearMonth=2026-06");

    // Reads (and the mutation hooks keyed off the same resolved value)
    // target the selected planned month, not the open month.
    expect(mockUseBudgetMonthDebtEditor).toHaveBeenCalledWith(
      "2026-06",
      true,
    );
  });

  it("targets a closed month from ?yearMonth", () => {
    loadingQueries();

    renderAt("/dashboard/debts?yearMonth=2026-04");

    expect(mockUseBudgetMonthDebtEditor).toHaveBeenCalledWith(
      "2026-04",
      true,
    );
  });

  it("refuses an unknown month instead of silently editing the open month", () => {
    loadingQueries();

    renderAt("/dashboard/debts?yearMonth=2099-01");

    expect(
      screen.getByText("The selected month does not exist in your budget."),
    ).toBeInTheDocument();
    expect(mockUseBudgetMonthDebtEditor).toHaveBeenCalledWith(
      undefined,
      false,
    );
  });
});
