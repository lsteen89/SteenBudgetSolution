import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PlanningRow from "./PlanningRow";
import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import type { NextMonthPreviewDto } from "@/types/budget/NextMonthPreviewDto";

// ---- Hook mocks ----------------------------------------------------------

const mockUseNextMonthPreviewQuery = vi.fn();

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en",
}));

vi.mock("@/hooks/budget/useNextMonthPreviewQuery", () => ({
  useNextMonthPreviewQuery: (...args: unknown[]) =>
    mockUseNextMonthPreviewQuery(...args),
}));

function planDashboard(
  overrides: Partial<BudgetDashboardDto> = {},
): BudgetDashboardDto {
  return {
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
    ...overrides,
  } as BudgetDashboardDto;
}

function previewAvailable(): NextMonthPreviewDto {
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
    dashboard: planDashboard(),
    limitations: [],
  };
}

function previewUnavailable(): NextMonthPreviewDto {
  return {
    fromYearMonth: "2026-05",
    previewYearMonth: "2026-06",
    state: "unavailable",
    basis: "budgetPlan",
    currencyCode: "SEK",
    carryOver: { mode: "none", amount: 0, source: "none", isFinal: false },
    dashboard: null,
    limitations: ["no open month"],
  };
}

function renderRow() {
  return render(
    <MemoryRouter>
      <PlanningRow
        fromYearMonth="2026-05"
        remainingToSpend={18623}
        periodLabel="May 2026"
        currency="SEK"
      />
    </MemoryRouter>,
  );
}

describe("PlanningRow", () => {
  beforeEach(() => {
    mockUseNextMonthPreviewQuery.mockReset();
    mockUseNextMonthPreviewQuery.mockReturnValue({
      data: previewAvailable(),
      isPending: false,
      isError: false,
    });
  });

  it("renders the three planning cards", () => {
    renderRow();
    expect(screen.getByTestId("planning-card-this-month")).toBeInTheDocument();
    expect(screen.getByTestId("planning-card-next-month")).toBeInTheDocument();
    expect(screen.getByTestId("planning-card-budget-plan")).toBeInTheDocument();
    expect(screen.getByText("This month")).toBeInTheDocument();
    expect(screen.getByText("Next month")).toBeInTheDocument();
    expect(screen.getByText("Budget plan")).toBeInTheDocument();
  });

  it("shows this month's free amount and links to the breakdown", () => {
    renderRow();
    expect(screen.getByTestId("planning-this-amount").textContent).toMatch(
      /\d/,
    );
    expect(
      screen.getByTestId("planning-see-allocation").getAttribute("href"),
    ).toBe("/dashboard/breakdown");
  });

  it("routes the primary CTA to the next-month preview page", () => {
    renderRow();
    expect(
      screen.getByTestId("planning-next-cta").getAttribute("href"),
    ).toBe("/dashboard/next-month");
  });

  it("shows the backend preview figure when a preview is available", () => {
    renderRow();
    const card = screen.getByTestId("planning-card-next-month");
    expect(within(card).getByText("Preview")).toBeInTheDocument();
    expect(within(card).getByTestId("planning-next-amount").textContent).toMatch(
      /\d/,
    );
    expect(within(card).queryByText("Not opened")).not.toBeInTheDocument();
    expect(
      within(card).queryByText("Opens when you close this month."),
    ).not.toBeInTheDocument();
  });

  it("shows a negative preview figure as a shortfall, not green free money", () => {
    mockUseNextMonthPreviewQuery.mockReturnValue({
      data: {
        ...previewAvailable(),
        dashboard: planDashboard({
          finalBalanceWithCarryMonthly: -1250,
        }),
      },
      isPending: false,
      isError: false,
    });
    renderRow();

    const card = screen.getByTestId("planning-card-next-month");
    const amount = within(card).getByTestId("planning-next-amount");
    expect(amount.textContent).toContain("−");
    expect(amount).toHaveClass("text-eb-danger");
    expect(
      within(card).getByText("short, if nothing changes"),
    ).toBeInTheDocument();
  });

  it("shows a factual state line and no figure when preview is unavailable", () => {
    mockUseNextMonthPreviewQuery.mockReturnValue({
      data: previewUnavailable(),
      isPending: false,
      isError: false,
    });
    renderRow();
    const card = screen.getByTestId("planning-card-next-month");
    expect(within(card).getByText("Not opened")).toBeInTheDocument();
    expect(
      within(card).getByText("Opens when you close this month."),
    ).toBeInTheDocument();
    expect(
      within(card).queryByTestId("planning-next-amount"),
    ).not.toBeInTheDocument();
    // CTA still routes to the preview page, which owns the unavailable state.
    expect(
      within(card).getByTestId("planning-next-cta").getAttribute("href"),
    ).toBe("/dashboard/next-month");
  });

  it("does not show a fake figure for an empty budget plan", () => {
    mockUseNextMonthPreviewQuery.mockReturnValue({
      data: {
        ...previewAvailable(),
        dashboard: planDashboard({
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
            repaymentStrategy: "avalanche",
          },
        }),
      },
      isPending: false,
      isError: false,
    });
    renderRow();
    const card = screen.getByTestId("planning-card-next-month");
    expect(
      within(card).queryByTestId("planning-next-amount"),
    ).not.toBeInTheDocument();
    expect(within(card).getByText("Not opened")).toBeInTheDocument();
  });

  it("offers no action on the budget plan card (no plan route yet)", () => {
    renderRow();
    const card = screen.getByTestId("planning-card-budget-plan");
    expect(within(card).queryByRole("link")).not.toBeInTheDocument();
    expect(within(card).queryByRole("button")).not.toBeInTheDocument();
  });
});
