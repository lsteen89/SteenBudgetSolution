import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import NextMonthPreviewDetail from "./NextMonthPreviewDetail";
import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import type { BudgetDashboardMonthDto } from "@/types/budget/BudgetDashboardMonthDto";
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

// ---- Fixtures -------------------------------------------------------------

/**
 * Live-dashboard shape with explicit equation terms. `remaining` is the
 * backend value (`finalBalanceWithCarryMonthly`); used both as this month's
 * dashboard and (with different terms) as the preview's dashboard.
 */
function liveDashboard(overrides: {
  income?: number;
  carryOver?: number;
  expenses?: number;
  savings?: number;
  debts?: number;
  remaining: number;
}): BudgetDashboardDto {
  const {
    income = 0,
    carryOver = 0,
    expenses = 0,
    savings = 0,
    debts = 0,
    remaining,
  } = overrides;
  return {
    budgetId: "00000000-0000-0000-0000-000000000001",
    income: {
      netSalaryMonthly: income,
      incomePaymentDayType: null,
      incomePaymentDay: null,
      sideHustleMonthly: 0,
      householdMembersMonthly: 0,
      totalIncomeMonthly: income,
      sideHustles: [],
      householdMembers: [],
    },
    expenditure: { totalExpensesMonthly: expenses, byCategory: [] },
    savings: {
      monthlySavings: savings,
      totalGoalSavingsMonthly: 0,
      totalSavingsMonthly: savings,
      isMonthOnly: false,
      goals: [],
    },
    debt: {
      totalDebtBalance: 0,
      totalMonthlyPayments: debts,
      debts: [],
      repaymentStrategy: null,
    },
    carryOverAmountMonthly: carryOver,
    disposableAfterExpensesWithCarryMonthly: income + carryOver - expenses,
    disposableAfterExpensesAndSavingsWithCarryMonthly:
      income + carryOver - expenses - savings,
    finalBalanceWithCarryMonthly: remaining,
    recurringExpenses: [],
    subscriptions: { totalMonthlyAmount: 0, count: 0, items: [] },
  } as BudgetDashboardDto;
}

/** Current open month: 51 700 + 1 200 − 24 377 − 8 000 − 4 500 = 16 023. */
function currentMonthDto(): BudgetDashboardMonthDto {
  return {
    currencyCode: "SEK",
    month: {
      yearMonth: "2026-05",
      status: "open",
      carryOverMode: "none",
      carryOverAmount: null,
      isCloseWindowOpen: false,
      closeWindowOpensAtUtc: null,
      closeEligibleAtUtc: null,
      isOverdueForClose: false,
    },
    liveDashboard: liveDashboard({
      income: 51700,
      carryOver: 1200,
      expenses: 24377,
      savings: 8000,
      debts: 4500,
      remaining: 16023,
    }),
    snapshotTotals: null,
  };
}

/** Preview: 49 100 + 16 023 − 23 200 − 8 000 − 4 500 = 29 423. */
function previewAvailable(): NextMonthPreviewDto {
  return {
    fromYearMonth: "2026-05",
    previewYearMonth: "2026-06",
    state: "preview",
    basis: "budgetPlan",
    currencyCode: "SEK",
    carryOver: {
      mode: "estimatedFull",
      amount: 16023,
      source: "currentMonthLiveFinalBalance",
      isFinal: false,
    },
    dashboard: liveDashboard({
      income: 49100,
      carryOver: 16023,
      expenses: 23200,
      savings: 8000,
      debts: 4500,
      remaining: 29423,
    }),
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

function renderDetail() {
  return render(
    <MemoryRouter>
      <NextMonthPreviewDetail
        fromYearMonth="2026-05"
        dashboardMonth={currentMonthDto()}
        currency="SEK"
      />
    </MemoryRouter>,
  );
}

const detail = () => screen.queryByTestId("next-month-preview-detail");

/**
 * Strip locale grouping/currency noise so money assertions don't depend on
 * which separator (space, nbsp, comma) the test runtime's ICU picks. Keeps
 * digits and the explicit sign characters the component renders.
 */
const moneyText = (el: HTMLElement) =>
  (el.textContent ?? "").replace(/[^\d−+-]/g, "");

describe("NextMonthPreviewDetail", () => {
  beforeEach(() => {
    mockUseNextMonthPreviewQuery.mockReset();
    mockUseNextMonthPreviewQuery.mockReturnValue({
      data: previewAvailable(),
      isPending: false,
      isError: false,
    });
  });

  it("renders the preview surface with the backend projected remaining", () => {
    renderDetail();
    expect(detail()).toBeInTheDocument();
    const amount = screen.getByTestId("next-month-preview-detail-amount");
    // 29 423 — straight from the preview dashboard, never computed here.
    expect(moneyText(amount)).toContain("29423");
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("renders nothing when the preview is unavailable", () => {
    mockUseNextMonthPreviewQuery.mockReturnValue({
      data: previewUnavailable(),
      isPending: false,
      isError: false,
    });
    renderDetail();
    expect(detail()).not.toBeInTheDocument();
  });

  it("renders nothing while the preview is loading or after an error", () => {
    mockUseNextMonthPreviewQuery.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    });
    renderDetail();
    expect(detail()).not.toBeInTheDocument();
  });

  it("renders nothing for an empty budget plan instead of a fake 0", () => {
    mockUseNextMonthPreviewQuery.mockReturnValue({
      data: {
        ...previewAvailable(),
        dashboard: liveDashboard({ carryOver: 16023, remaining: 16023 }),
      },
      isPending: false,
      isError: false,
    });
    renderDetail();
    expect(detail()).not.toBeInTheDocument();
  });

  it("shows delta chips only for terms that move, derived from the two DTOs", () => {
    renderDetail();
    // income 51 700 → 49 100, carry 1 200 → 16 023, expenses 24 377 → 23 200
    expect(
      moneyText(screen.getByTestId("next-month-preview-detail-delta-income")),
    ).toContain("−2600");
    expect(
      moneyText(
        screen.getByTestId("next-month-preview-detail-delta-carryOver"),
      ),
    ).toContain("+14823");
    expect(
      moneyText(
        screen.getByTestId("next-month-preview-detail-delta-expenses"),
      ),
    ).toContain("−1177");
    // savings and debts are unchanged — no chips
    expect(
      screen.queryByTestId("next-month-preview-detail-delta-savings"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("next-month-preview-detail-delta-debts"),
    ).not.toBeInTheDocument();
  });

  it("renders the carry-over assumption from preview.carryOver.amount", () => {
    renderDetail();
    const carry = screen.getByTestId("next-month-preview-detail-carry");
    expect(moneyText(carry)).toContain("16023");
    expect(carry.textContent).toContain("May 2026");
  });

  it("routes the ghost action to the full preview page", () => {
    renderDetail();
    expect(
      screen
        .getByTestId("next-month-preview-detail-open-full")
        .getAttribute("href"),
    ).toBe("/dashboard/next-month");
  });

  it("discloses per-term this-month → next-month values on demand", () => {
    renderDetail();
    const toggle = screen.getByTestId("next-month-preview-detail-diff-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle.textContent).toContain("3 changes");
    expect(
      screen.queryByTestId("next-month-preview-detail-diff-row-income"),
    ).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    const incomeRow = screen.getByTestId(
      "next-month-preview-detail-diff-row-income",
    );
    expect(moneyText(incomeRow)).toContain("51700");
    expect(moneyText(incomeRow)).toContain("49100");
    expect(moneyText(incomeRow)).toContain("−2600");
    // unchanged terms stay hidden, matching the "3 changes" count
    expect(
      screen.queryByTestId("next-month-preview-detail-diff-row-savings"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("next-month-preview-detail-diff-row-debts"),
    ).not.toBeInTheDocument();
  });

  it("queries the preview through the shared next-preview hook only", () => {
    renderDetail();
    expect(mockUseNextMonthPreviewQuery).toHaveBeenCalledWith(
      "2026-05",
      expect.objectContaining({ enabled: true }),
    );
  });
});
