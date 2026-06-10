import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import NextMonthPreviewPage from "./NextMonthPreviewPage";
import type { NextMonthPreviewDto } from "@/types/budget/NextMonthPreviewDto";

// ---- Hook / store mocks --------------------------------------------------

const mockUseBudgetMonthsStatusQuery = vi.fn();
const mockUseNextMonthPreviewQuery = vi.fn();

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en",
}));

vi.mock("@/stores/Auth/authStore", () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ user: { firstLogin: false } }),
}));

vi.mock("@/hooks/budget/useBudgetMonthsStatusQuery", () => ({
  useBudgetMonthsStatusQuery: () => mockUseBudgetMonthsStatusQuery(),
}));

vi.mock("@/hooks/budget/useNextMonthPreviewQuery", () => ({
  useNextMonthPreviewQuery: (...args: unknown[]) =>
    mockUseNextMonthPreviewQuery(...args),
}));

function statusWithOpenMonth(openMonth: string | null = "2026-05") {
  return {
    data: {
      openMonthYearMonth: openMonth,
      currentYearMonth: "2026-05",
      gapMonthsCount: 0,
      months: [],
      suggestedAction: "none" as const,
    },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

function previewSuccess(
  overrides: Partial<NextMonthPreviewDto> = {},
): NextMonthPreviewDto {
  const dashboard = {
    budgetId: "b1",
    income: {
      netSalaryMonthly: 38500,
      incomePaymentDayType: null,
      incomePaymentDay: null,
      sideHustleMonthly: 0,
      householdMembersMonthly: 13200,
      totalIncomeMonthly: 51700,
      sideHustles: [],
      householdMembers: [],
    },
    expenditure: { totalExpensesMonthly: 23200, byCategory: [] },
    savings: {
      monthlySavings: 3000,
      totalGoalSavingsMonthly: 5000,
      totalSavingsMonthly: 8000,
      isMonthOnly: false,
      goals: [],
    },
    debt: {
      totalDebtBalance: 114600,
      totalMonthlyPayments: 4500,
      debts: [],
      repaymentStrategy: "avalanche",
    },
    carryOverAmountMonthly: 18623,
    disposableAfterExpensesWithCarryMonthly: 47123,
    disposableAfterExpensesAndSavingsWithCarryMonthly: 39123,
    // 51700 + 18623 − 23200 − 8000 − 4500 = 34623
    finalBalanceWithCarryMonthly: 34623,
    recurringExpenses: [],
    subscriptions: { totalMonthlyAmount: 0, count: 0, items: [] },
  };

  return {
    fromYearMonth: "2026-05",
    previewYearMonth: "2026-06",
    state: "preview",
    basis: "budgetPlan",
    currencyCode: "SEK",
    carryOver: {
      mode: "estimatedFull",
      amount: 18623,
      source: "currentMonthLiveFinalBalance",
      isFinal: false,
    },
    dashboard: dashboard as unknown as NextMonthPreviewDto["dashboard"],
    limitations: ["Projected from your budget plan with nothing changed."],
    ...overrides,
  };
}

function previewQueryState(
  data: NextMonthPreviewDto | undefined,
  extra: Partial<{ isPending: boolean; isError: boolean; error: unknown }> = {},
) {
  return {
    data,
    isPending: extra.isPending ?? false,
    isError: extra.isError ?? false,
    error: extra.error ?? null,
    refetch: vi.fn(),
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <NextMonthPreviewPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUseBudgetMonthsStatusQuery.mockReset();
  mockUseNextMonthPreviewQuery.mockReset();
});

describe("NextMonthPreviewPage", () => {
  it("renders the backend preview figures and the estimated carry-over copy", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue(statusWithOpenMonth());
    mockUseNextMonthPreviewQuery.mockReturnValue(
      previewQueryState(previewSuccess()),
    );

    renderPage();

    // Preview state is visually + textually distinct, derived from the preview
    // year-month (not the active month) and labelled as a preview.
    const title = screen.getByTestId("next-month-preview-title");
    expect(title).toHaveTextContent(/june 2026/i);
    expect(title).toHaveTextContent(/preview/i);

    // Remaining anchor is the backend-authoritative finalBalanceWithCarryMonthly.
    expect(
      screen.getByTestId("next-month-preview-remaining"),
    ).toHaveTextContent(/34[\s,.]?623/);

    // Carry-over is shown as an estimate, finalised on close — never as final.
    const carry = screen.getByTestId("next-month-preview-carry-assumption");
    expect(carry).toHaveTextContent(/finalised when the month closes/i);
    expect(carry).toHaveTextContent(/may 2026/i);
  });

  it("never edits — no edit/quick-adjust controls appear", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue(statusWithOpenMonth());
    mockUseNextMonthPreviewQuery.mockReturnValue(
      previewQueryState(previewSuccess()),
    );

    renderPage();

    // The only interactive element is the calm "back to overview" link.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent(/back to overview/i);
  });

  it("calls the preview hook with the open month from /months/status", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue(
      statusWithOpenMonth("2026-05"),
    );
    mockUseNextMonthPreviewQuery.mockReturnValue(
      previewQueryState(previewSuccess()),
    );

    renderPage();

    expect(mockUseNextMonthPreviewQuery).toHaveBeenCalledWith(
      "2026-05",
      expect.objectContaining({ enabled: true }),
    );
  });

  it("shows the unavailable state when the preview is unavailable", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue(statusWithOpenMonth());
    mockUseNextMonthPreviewQuery.mockReturnValue(
      previewQueryState(
        previewSuccess({ state: "unavailable", dashboard: null }),
      ),
    );

    renderPage();

    expect(
      screen.getByTestId("next-month-preview-unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("next-month-preview-remaining"),
    ).not.toBeInTheDocument();
  });

  it("shows the empty-plan state when the preview projects an empty budget plan", () => {
    // A real preview (state: "preview") whose plan is empty: all four plan
    // components are zero. This must NOT fall through to a "0 kr / fully
    // assigned" money state.
    const emptyDashboard = {
      budgetId: "b1",
      income: {
        netSalaryMonthly: 0,
        incomePaymentDayType: null,
        incomePaymentDay: null,
        sideHustleMonthly: 0,
        householdMembersMonthly: 0,
        totalIncomeMonthly: 0,
        sideHustles: [],
        householdMembers: [],
      },
      expenditure: { totalExpensesMonthly: 0, byCategory: [] },
      savings: {
        monthlySavings: 0,
        totalGoalSavingsMonthly: 0,
        totalSavingsMonthly: 0,
        isMonthOnly: false,
        goals: [],
      },
      debt: {
        totalDebtBalance: 0,
        totalMonthlyPayments: 0,
        debts: [],
        repaymentStrategy: null,
      },
      carryOverAmountMonthly: 0,
      disposableAfterExpensesWithCarryMonthly: 0,
      disposableAfterExpensesAndSavingsWithCarryMonthly: 0,
      finalBalanceWithCarryMonthly: 0,
      recurringExpenses: [],
      subscriptions: { totalMonthlyAmount: 0, count: 0, items: [] },
    };

    mockUseBudgetMonthsStatusQuery.mockReturnValue(statusWithOpenMonth());
    mockUseNextMonthPreviewQuery.mockReturnValue(
      previewQueryState(
        previewSuccess({
          carryOver: {
            mode: "none",
            amount: 0,
            source: "none",
            isFinal: false,
          },
          dashboard:
            emptyDashboard as unknown as NextMonthPreviewDto["dashboard"],
        }),
      ),
    );

    renderPage();

    expect(
      screen.getByTestId("next-month-preview-empty"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("next-month-preview-remaining"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/fully assigned/i)).not.toBeInTheDocument();
  });

  it("shows the unavailable state when there is no open month to project from", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue(statusWithOpenMonth(null));
    mockUseNextMonthPreviewQuery.mockReturnValue(previewQueryState(undefined));

    renderPage();

    expect(
      screen.getByTestId("next-month-preview-unavailable"),
    ).toBeInTheDocument();
    // Preview hook stays disabled — no fabricated from-month.
    expect(mockUseNextMonthPreviewQuery).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ enabled: false }),
    );
  });

  it("renders a skeleton while the preview is loading", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue(statusWithOpenMonth());
    mockUseNextMonthPreviewQuery.mockReturnValue(
      previewQueryState(undefined, { isPending: true }),
    );

    renderPage();

    expect(
      screen.getByTestId("next-month-preview-skeleton"),
    ).toBeInTheDocument();
  });

  it("renders the calm error panel when the preview query errors", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue(statusWithOpenMonth());
    mockUseNextMonthPreviewQuery.mockReturnValue(
      previewQueryState(undefined, { isError: true, error: new Error("boom") }),
    );

    renderPage();

    expect(
      screen.queryByTestId("next-month-preview-remaining"),
    ).not.toBeInTheDocument();
    // DashboardErrorState renders a heading + retry/reload controls.
    expect(
      screen.getByRole("heading", { name: /load the preview/i }),
    ).toBeInTheDocument();
  });
});
