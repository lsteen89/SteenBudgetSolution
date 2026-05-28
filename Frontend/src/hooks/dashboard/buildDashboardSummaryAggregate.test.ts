import { afterEach, describe, expect, it, vi } from "vitest";

import type { BudgetDashboardMonthDto } from "@/types/budget/BudgetDashboardMonthDto";

import { buildDashboardSummaryAggregate } from "./buildDashboardSummaryAggregate";

function buildAprilDashboardDto(): BudgetDashboardMonthDto {
  return {
    currencyCode: "SEK",
    month: {
      yearMonth: "2026-04",
      status: "open",
      carryOverMode: "full",
      carryOverAmount: null,
      isCloseWindowOpen: true,
      closeWindowOpensAtUtc: "2026-04-22T00:00:00Z",
      closeEligibleAtUtc: "2026-04-25T00:00:00Z",
      isOverdueForClose: true,
    },
    liveDashboard: {
      budgetId: "budget-1",
      income: {
        netSalaryMonthly: 42000,
        incomePaymentDayType: "dayOfMonth",
        incomePaymentDay: 25,
        sideHustleMonthly: 3000,
        householdMembersMonthly: 8500,
        totalIncomeMonthly: 53500,
        sideHustles: [],
        householdMembers: [],
      },
      expenditure: {
        totalExpensesMonthly: 43015,
        byCategory: [],
      },
      savings: {
        monthlySavings: 3000,
        totalGoalSavingsMonthly: 4000,
        totalSavingsMonthly: 7000,
        isMonthOnly: false,
        goals: [
          {
            id: "home-repair",
            name: "Home Repair",
            targetAmount: 50000,
            targetDate: "2027-10-01T00:00:00",
            amountSaved: 25600,
            monthlyContribution: 800,
          },
          {
            id: "emergency-fund",
            name: "Emergency Fund",
            targetAmount: 120000,
            targetDate: "2028-04-01T00:00:00",
            amountSaved: 74600,
            monthlyContribution: 2200,
          },
          {
            id: "vacation-fund",
            name: "Vacation Fund",
            targetAmount: 36000,
            targetDate: "2027-02-01T00:00:00",
            amountSaved: 21800,
            monthlyContribution: 1000,
          },
        ],
      },
      debt: {
        totalDebtBalance: 112650,
        totalMonthlyPayments: 2535,
        debts: [
          {
            id: "car-loan",
            name: "Car Loan",
            type: "installment",
            balance: 93000,
            apr: 0,
            monthlyPayment: 1550,
          },
          {
            id: "credit-card",
            name: "Credit Card",
            type: "revolving",
            balance: 17250,
            apr: 19.9,
            monthlyPayment: 785,
          },
          {
            id: "bike-financing",
            name: "Bike Financing",
            type: "installment",
            balance: 2400,
            apr: 0,
            monthlyPayment: 200,
          },
        ],
        repaymentStrategy: "snowball",
      },
      carryOverAmountMonthly: 0,
      disposableAfterExpensesWithCarryMonthly: 10485,
      disposableAfterExpensesAndSavingsWithCarryMonthly: 3485,
      finalBalanceWithCarryMonthly: 950,
      recurringExpenses: [],
      subscriptions: {
        totalMonthlyAmount: 0,
        count: 0,
        items: [],
      },
    },
    snapshotTotals: null,
  };
}

describe("buildDashboardSummaryAggregate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses backend-owned savings totals instead of recalculating goal contributions", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T00:00:00Z"));

    const aggregate = buildDashboardSummaryAggregate(
      buildAprilDashboardDto(),
      "sv",
    );

    expect(aggregate.summary.totalIncome).toBe(53500);
    expect(aggregate.summary.totalExpenditure).toBe(43015);
    expect(aggregate.summary.totalSavings).toBe(7000);
    expect(aggregate.summary.goalSavings).toBe(4000);
    expect(aggregate.summary.totalDebtPayments).toBe(2535);
    expect(aggregate.summary.incomingCarryOverAmount).toBe(0);
    expect(aggregate.summary.remainingToSpend).toBe(950);
    expect(
      aggregate.summary.totalSavings + aggregate.summary.totalDebtPayments,
    ).toBe(9535);
  });

  it("uses backend carry-over amount in summary math without deriving it client-side", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T00:00:00Z"));

    const dashboard = buildAprilDashboardDto();
    dashboard.liveDashboard!.carryOverAmountMonthly = 668;
    dashboard.liveDashboard!.disposableAfterExpensesWithCarryMonthly = 11153;
    dashboard.liveDashboard!.disposableAfterExpensesAndSavingsWithCarryMonthly = 4153;
    dashboard.liveDashboard!.finalBalanceWithCarryMonthly = 1618;
    dashboard.month.carryOverAmount = 668;

    const aggregate = buildDashboardSummaryAggregate(dashboard, "sv");

    expect(aggregate.summary.incomingCarryOverAmount).toBe(668);
    expect(aggregate.summary.remainingToSpend).toBe(1618);
    expect(
      aggregate.summary.incomingCarryOverAmount
        + aggregate.summary.totalIncome
        - aggregate.summary.totalExpenditure
        - aggregate.summary.totalSavings
        - aggregate.summary.totalDebtPayments,
    ).toBe(1618);
  });
});
