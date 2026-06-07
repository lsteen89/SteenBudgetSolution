import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type {
  DashboardBreakdown,
  DashboardSummary,
} from "@/hooks/dashboard/dashboardSummary.types";
import type { BudgetDashboardMonthDto } from "@/types/budget/BudgetDashboardMonthDto";
import { pillarWorkbenchDict } from "@/utils/i18n/pages/private/dashboard/openMonth/PillarWorkbench.i18n";

import OpenMonthPillarWorkbench from "./OpenMonthPillarWorkbench";

// Stable English locale so copy assertions don't drift.
vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));

type SummaryOverrides = Partial<DashboardSummary>;
type BreakdownOverrides = Partial<DashboardBreakdown>;

function makeSummary(overrides: SummaryOverrides = {}): DashboardSummary {
  return {
    header: {
      periodKey: "2026-04",
      periodLabel: "April 2026",
      periodDateRangeLabel: "Apr 1–30, 2026",
      periodStatus: "open",
      previousPeriodLabel: null,
      nextPeriodLabel: null,
      previousPeriodKey: null,
      nextPeriodKey: null,
      canGoPrevious: false,
      canGoNext: false,
      canCloseMonth: false,
      closeMonthButtonLabel: null,
      lifecycleState: "normal",
      noticeText: null,
      closeEligibleAt: null,
      closeWindowOpensAt: null,
    },
    remainingToSpend: 0,
    currency: "SEK",
    emergencyFundAmount: 0,
    emergencyFundMonths: 0,
    goalsProgressPercent: 0,
    totalIncome: 0,
    totalExpenditure: 0,
    incomingCarryOverAmount: 0,
    habitSavings: 0,
    goalSavings: 0,
    totalSavings: 0,
    totalDebtPayments: 0,
    finalBalance: 0,
    subscriptionsTotal: 0,
    subscriptionsCount: 0,
    subscriptions: [],
    pillarDescriptions: {
      income: "",
      expenditure: "",
      savings: "",
      debts: "",
    },
    recurringExpenses: [],
    ...overrides,
  };
}

function makeBreakdown(overrides: BreakdownOverrides = {}): DashboardBreakdown {
  return {
    incomeItems: [],
    expenseCategoryItems: [],
    savingsItems: [],
    debtItems: [],
    ...overrides,
  };
}

function makeDashboardMonth(
  liveOverrides: Partial<
    NonNullable<BudgetDashboardMonthDto["liveDashboard"]>
  > = {},
): BudgetDashboardMonthDto {
  return {
    currencyCode: "SEK",
    month: {
      yearMonth: "2026-04",
      status: "open",
      carryOverMode: "none",
      carryOverAmount: null,
      isCloseWindowOpen: false,
      closeWindowOpensAtUtc: null,
      closeEligibleAtUtc: null,
      isOverdueForClose: false,
    },
    liveDashboard: {
      budgetId: "00000000-0000-0000-0000-000000000001",
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
      ...liveOverrides,
    },
    snapshotTotals: null,
  };
}

function renderWorkbench(args: {
  summary: DashboardSummary;
  breakdown: DashboardBreakdown;
  dashboardMonth: BudgetDashboardMonthDto;
  handlers?: Partial<{
    onOpenIncomeEditor: () => void;
    onOpenFullIncomeEditor: () => void;
    onOpenPeriodEditor: () => void;
    onOpenFullExpenseEditor: () => void;
    onOpenSavingsEditor: () => void;
    onOpenFullSavingsEditor: () => void;
    onOpenDebtsEditor: () => void;
    onOpenFullDebtsEditor: () => void;
  }>;
}) {
  const noop = () => {};
  const h = {
    onOpenIncomeEditor: noop,
    onOpenFullIncomeEditor: noop,
    onOpenPeriodEditor: noop,
    onOpenFullExpenseEditor: noop,
    onOpenSavingsEditor: noop,
    onOpenFullSavingsEditor: noop,
    onOpenDebtsEditor: noop,
    onOpenFullDebtsEditor: noop,
    ...args.handlers,
  };

  return render(
    <OpenMonthPillarWorkbench
      summary={args.summary}
      breakdown={args.breakdown}
      dashboardMonth={args.dashboardMonth}
      {...h}
    />,
  );
}

describe("OpenMonthPillarWorkbench — income pillar", () => {
  it("splits totals across salary, side and household groups", () => {
    renderWorkbench({
      summary: makeSummary({ totalIncome: 42000 }),
      breakdown: makeBreakdown({
        incomeItems: [
          { key: "income:0:salary", label: "Net salary", amount: 25000 },
          { key: "income:1:side:freelance", label: "Freelance", amount: 5000 },
          {
            key: "income:2:member:partner",
            label: "Partner",
            amount: 12000,
          },
        ],
      }),
      dashboardMonth: makeDashboardMonth(),
    });

    const income = screen.getByTestId("pillar-income");
    expect(
      within(income).getByTestId("pillar-income-salary").textContent ?? "",
    ).toMatch(/25,000/);
    expect(
      within(income).getByTestId("pillar-income-side").textContent ?? "",
    ).toMatch(/5,000/);
    expect(
      within(income).getByTestId("pillar-income-household").textContent ?? "",
    ).toMatch(/12,000/);
    // "3 sources planned"
    expect(within(income).getByText(/3 sources planned/i)).toBeInTheDocument();
  });

  it("falls back to a quiet empty state when no income is planned", () => {
    renderWorkbench({
      summary: makeSummary({ totalIncome: 0 }),
      breakdown: makeBreakdown({ incomeItems: [] }),
      dashboardMonth: makeDashboardMonth(),
    });

    const income = screen.getByTestId("pillar-income");
    expect(
      within(income).queryByTestId("pillar-income-salary"),
    ).not.toBeInTheDocument();
    // The same "no income planned yet" copy is reused for both the card
    // subtitle and the empty signal fallback, so it appears twice.
    expect(
      within(income).getAllByText(pillarWorkbenchDict.en.incomeSubtitleNone),
    ).toHaveLength(2);
  });
});

describe("OpenMonthPillarWorkbench — expenses pillar", () => {
  it("shows top categories and the subscription + recurring pressure chips", () => {
    renderWorkbench({
      summary: makeSummary({
        totalExpenditure: 14000,
        subscriptionsCount: 4,
        subscriptionsTotal: 320,
        recurringExpenses: [
          {
            id: "r1",
            nameKey: "Rent",
            nameLabel: "Rent",
            categoryKey: "fixedExpenses",
            categoryLabel: "Fixed",
            amountMonthly: 9000,
          },
          {
            id: "r2",
            nameKey: "Insurance",
            nameLabel: "Insurance",
            categoryKey: "fixedExpenses",
            categoryLabel: "Fixed",
            amountMonthly: 800,
          },
        ],
      }),
      breakdown: makeBreakdown({
        expenseCategoryItems: [
          { key: "expense:food", label: "Food", amount: 4000 },
          { key: "expense:fixed", label: "Fixed", amount: 9000 },
          { key: "expense:fun", label: "Fun", amount: 1000 },
          { key: "expense:other", label: "Other", amount: 0 },
        ],
      }),
      dashboardMonth: makeDashboardMonth(),
    });

    const expenses = screen.getByTestId("pillar-expenses");

    // Top categories rendered in amount-desc order; the zero-amount category
    // is filtered out.
    expect(
      within(expenses).getByTestId("pillar-expenses-category-expense:fixed"),
    ).toBeInTheDocument();
    expect(
      within(expenses).getByTestId("pillar-expenses-category-expense:food"),
    ).toBeInTheDocument();
    expect(
      within(expenses).queryByTestId(
        "pillar-expenses-category-expense:other",
      ),
    ).not.toBeInTheDocument();

    const subs = within(expenses).getByTestId("pillar-expenses-subscriptions");
    expect(subs.textContent ?? "").toMatch(/4/);
    expect(subs.textContent ?? "").toMatch(/320/);
    // Annual amount derived as monthly * 12 = 3,840.
    expect(subs.textContent ?? "").toMatch(/3,840/);

    const recurring = within(expenses).getByTestId(
      "pillar-expenses-recurring",
    );
    expect(recurring.textContent ?? "").toMatch(/2/);
    expect(recurring.textContent ?? "").toMatch(/9,800/);
  });
});

describe("OpenMonthPillarWorkbench — savings pillar", () => {
  it("renders the goal progress bar with the funded percentage", () => {
    renderWorkbench({
      summary: makeSummary({
        totalSavings: 1500,
        habitSavings: 500,
        goalSavings: 1000,
        goalsProgressPercent: 42.3,
      }),
      breakdown: makeBreakdown(),
      dashboardMonth: makeDashboardMonth({
        savings: {
          monthlySavings: 500,
          totalGoalSavingsMonthly: 1000,
          totalSavingsMonthly: 1500,
          isMonthOnly: false,
          goals: [
            {
              id: "g1",
              name: "Emergency",
              targetAmount: 10000,
              targetDate: null,
              amountSaved: 4000,
              monthlyContribution: 500,
            },
            {
              id: "g2",
              name: "Vacation",
              targetAmount: 5000,
              targetDate: null,
              amountSaved: 2000,
              monthlyContribution: 500,
            },
          ],
        },
      }),
    });

    const savings = screen.getByTestId("pillar-savings");
    expect(
      within(savings).getByTestId("pillar-savings-habit"),
    ).toBeInTheDocument();
    expect(
      within(savings).getByTestId("pillar-savings-goals"),
    ).toBeInTheDocument();

    const progress = within(savings).getByRole("progressbar");
    expect(progress).toHaveAttribute("aria-valuenow", "42");
  });

  it("clamps goal progress to 100 if backend reports an overshoot", () => {
    renderWorkbench({
      summary: makeSummary({
        totalSavings: 1500,
        habitSavings: 500,
        goalSavings: 1000,
        goalsProgressPercent: 142,
      }),
      breakdown: makeBreakdown(),
      dashboardMonth: makeDashboardMonth({
        savings: {
          monthlySavings: 500,
          totalGoalSavingsMonthly: 1000,
          totalSavingsMonthly: 1500,
          isMonthOnly: false,
          goals: [
            {
              id: "g1",
              name: "Goal",
              targetAmount: 1000,
              targetDate: null,
              amountSaved: 1500,
              monthlyContribution: 500,
            },
          ],
        },
      }),
    });

    const progress = screen.getByRole("progressbar");
    expect(progress).toHaveAttribute("aria-valuenow", "100");
  });
});

describe("OpenMonthPillarWorkbench — debts pillar", () => {
  it("renders monthly payment, total balance and a localised strategy chip", () => {
    renderWorkbench({
      summary: makeSummary({ totalDebtPayments: 2500 }),
      breakdown: makeBreakdown(),
      dashboardMonth: makeDashboardMonth({
        debt: {
          totalDebtBalance: 75000,
          totalMonthlyPayments: 2500,
          repaymentStrategy: "Avalanche",
          debts: [
            {
              id: "d1",
              name: "Card",
              type: "credit",
              balance: 50000,
              apr: 18,
              monthlyPayment: 2000,
            },
            {
              id: "d2",
              name: "Loan",
              type: "loan",
              balance: 25000,
              apr: 5,
              monthlyPayment: 500,
            },
          ],
        },
      }),
    });

    const debts = screen.getByTestId("pillar-debts");
    expect(
      within(debts).getByTestId("pillar-debts-monthly").textContent ?? "",
    ).toMatch(/2,500/);
    expect(
      within(debts).getByTestId("pillar-debts-balance").textContent ?? "",
    ).toMatch(/75,000/);
    const strategy = within(debts).getByTestId("pillar-debts-strategy");
    expect(strategy.textContent ?? "").toMatch(
      new RegExp(pillarWorkbenchDict.en.strategyAvalanche),
    );
    // Subtitle reflects 2 debts in the plan.
    expect(within(debts).getByText(/2 debts in the plan/i)).toBeInTheDocument();
  });

  it("omits the strategy chip when the backend has no strategy value", () => {
    renderWorkbench({
      summary: makeSummary({ totalDebtPayments: 500 }),
      breakdown: makeBreakdown(),
      dashboardMonth: makeDashboardMonth({
        debt: {
          totalDebtBalance: 1000,
          totalMonthlyPayments: 500,
          repaymentStrategy: null,
          debts: [
            {
              id: "d1",
              name: "Loan",
              type: "loan",
              balance: 1000,
              apr: 0,
              monthlyPayment: 500,
            },
          ],
        },
      }),
    });

    expect(screen.queryByTestId("pillar-debts-strategy")).not.toBeInTheDocument();
  });
});

describe("OpenMonthPillarWorkbench — quick adjust + edit-all wiring", () => {
  it("routes each pillar's primary button to the quick-adjust handler", async () => {
    const handlers = {
      onOpenIncomeEditor: vi.fn(),
      onOpenPeriodEditor: vi.fn(),
      onOpenSavingsEditor: vi.fn(),
      onOpenDebtsEditor: vi.fn(),
    };

    renderWorkbench({
      summary: makeSummary({
        totalIncome: 1,
        totalExpenditure: 1,
        totalSavings: 1,
        totalDebtPayments: 1,
      }),
      breakdown: makeBreakdown(),
      dashboardMonth: makeDashboardMonth(),
      handlers,
    });

    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", {
        name: pillarWorkbenchDict.en.actionQuickAdjustIncome,
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: pillarWorkbenchDict.en.actionQuickAdjustExpenses,
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: pillarWorkbenchDict.en.actionQuickAdjustSavings,
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: pillarWorkbenchDict.en.actionQuickAdjustDebts,
      }),
    );

    expect(handlers.onOpenIncomeEditor).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenPeriodEditor).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenSavingsEditor).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenDebtsEditor).toHaveBeenCalledTimes(1);
  });
});

describe("OpenMonthPillarWorkbench — i18n parity", () => {
  it("keeps en/sv/et keys aligned for the pillar workbench dictionary", () => {
    const reference = Object.keys(pillarWorkbenchDict.sv).sort();
    expect(Object.keys(pillarWorkbenchDict.en).sort()).toEqual(reference);
    expect(Object.keys(pillarWorkbenchDict.et).sort()).toEqual(reference);
  });
});
