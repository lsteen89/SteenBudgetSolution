import { describe, expect, it } from "vitest";

import type { BudgetDashboardMonthDto } from "@/types/budget/BudgetDashboardMonthDto";

import {
  DASHBOARD_TERMS_RECONCILE_EPSILON,
  buildDashboardTerms,
} from "./dashboardTerms";

function buildOpenDto(overrides?: {
  income?: number;
  expenses?: number;
  savings?: number;
  debts?: number;
  carryOver?: number;
  finalBalanceWithCarry?: number;
}): BudgetDashboardMonthDto {
  const income = overrides?.income ?? 30000;
  const expenses = overrides?.expenses ?? 18000;
  const savings = overrides?.savings ?? 4000;
  const debts = overrides?.debts ?? 2000;
  const carryOver = overrides?.carryOver ?? 0;
  const finalBalanceWithCarry =
    overrides?.finalBalanceWithCarry ??
    income + carryOver - expenses - savings - debts;

  return {
    currencyCode: "SEK",
    month: {
      yearMonth: "2026-06",
      status: "open",
      carryOverMode: "full",
      carryOverAmount: carryOver,
      isCloseWindowOpen: false,
      closeWindowOpensAtUtc: null,
      closeEligibleAtUtc: null,
      isOverdueForClose: false,
    },
    liveDashboard: {
      budgetId: "budget-1",
      income: {
        netSalaryMonthly: income,
        incomePaymentDayType: "dayOfMonth",
        incomePaymentDay: 25,
        sideHustleMonthly: 0,
        householdMembersMonthly: 0,
        totalIncomeMonthly: income,
        sideHustles: [],
        householdMembers: [],
      },
      expenditure: {
        totalExpensesMonthly: expenses,
        byCategory: [],
      },
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
      },
      carryOverAmountMonthly: carryOver,
      disposableAfterExpensesWithCarryMonthly:
        income + carryOver - expenses,
      disposableAfterExpensesAndSavingsWithCarryMonthly:
        income + carryOver - expenses - savings,
      finalBalanceWithCarryMonthly: finalBalanceWithCarry,
      recurringExpenses: [],
      subscriptions: { totalMonthlyAmount: 0, count: 0, items: [] },
    },
    snapshotTotals: null,
  };
}

describe("buildDashboardTerms — open month", () => {
  it("returns the six named terms with carry-over kept separate from income", () => {
    const result = buildDashboardTerms(
      buildOpenDto({
        income: 30000,
        carryOver: 500,
        expenses: 18000,
        savings: 4000,
        debts: 2000,
      }),
    );

    expect(result.terms.income).toBe(30000);
    expect(result.terms.carryOver).toBe(500);
    expect(result.terms.expenses).toBe(18000);
    expect(result.terms.savings).toBe(4000);
    expect(result.terms.debts).toBe(2000);
    // carry-over is NOT folded into income
    expect(result.terms.income).not.toBe(30500);
  });

  it("exposes terms.remaining as the backend finalBalanceWithCarryMonthly value", () => {
    const result = buildDashboardTerms(
      buildOpenDto({
        income: 42000,
        carryOver: 0,
        expenses: 25000,
        savings: 5000,
        debts: 3000,
        // Backend authoritative remaining
        finalBalanceWithCarry: 9000,
      }),
    );

    expect(result.terms.remaining).toBe(9000);
    expect(result.computedRemaining).toBe(9000);
    expect(result.reconciles).toBe(true);
    expect(result.reconcileDelta).toBe(0);
  });

  it("reconciles a zero-remaining month exactly", () => {
    const result = buildDashboardTerms(
      buildOpenDto({
        income: 20000,
        carryOver: 0,
        expenses: 15000,
        savings: 3000,
        debts: 2000,
      }),
    );

    expect(result.terms.remaining).toBe(0);
    expect(result.computedRemaining).toBe(0);
    expect(result.reconciles).toBe(true);
  });

  it("preserves negative remaining for a deficit month and still reconciles", () => {
    const result = buildDashboardTerms(
      buildOpenDto({
        income: 18000,
        carryOver: 0,
        expenses: 20000,
        savings: 1500,
        debts: 1500,
      }),
    );

    expect(result.terms.remaining).toBe(-5000);
    expect(result.computedRemaining).toBe(-5000);
    expect(result.reconciles).toBe(true);
  });

  it("keeps terms.remaining backend-authoritative when the client equation disagrees", () => {
    // Backend says 7000, client equation would compute 6000. Display value
    // must follow the backend; the client number is exposed only as a
    // diagnostic on computedRemaining.
    const result = buildDashboardTerms(
      buildOpenDto({
        income: 30000,
        carryOver: 0,
        expenses: 18000,
        savings: 4000,
        debts: 2000,
        finalBalanceWithCarry: 7000,
      }),
    );

    expect(result.terms.remaining).toBe(7000); // backend wins
    expect(result.computedRemaining).toBe(6000);
    expect(result.reconciles).toBe(false);
    expect(result.reconcileDelta).toBeGreaterThan(
      DASHBOARD_TERMS_RECONCILE_EPSILON,
    );
  });

  it("tolerates a single-öre rounding drift between client and backend", () => {
    // Backend reports 6000.01, client sums to 6000. Within epsilon this still
    // counts as reconciled, but terms.remaining keeps the backend value.
    const result = buildDashboardTerms(
      buildOpenDto({
        income: 30000,
        carryOver: 0,
        expenses: 18000,
        savings: 4000,
        debts: 2000,
        finalBalanceWithCarry: 6000.01,
      }),
    );

    expect(result.terms.remaining).toBe(6000.01);
    expect(result.computedRemaining).toBe(6000);
    expect(result.reconciles).toBe(true);
    expect(result.reconcileDelta).toBeLessThanOrEqual(
      DASHBOARD_TERMS_RECONCILE_EPSILON,
    );
  });

  it("throws when an open month has no liveDashboard payload", () => {
    const dto = buildOpenDto();
    dto.liveDashboard = null;

    expect(() => buildDashboardTerms(dto)).toThrow(/liveDashboard is missing/);
  });
});

describe("buildDashboardTerms — closed month", () => {
  it("uses snapshot totals with carry-over modelled as zero", () => {
    const dto: BudgetDashboardMonthDto = {
      currencyCode: "SEK",
      month: {
        yearMonth: "2026-05",
        status: "closed",
        carryOverMode: "full",
        carryOverAmount: null,
        isCloseWindowOpen: false,
        closeWindowOpensAtUtc: null,
        closeEligibleAtUtc: null,
        isOverdueForClose: false,
      },
      liveDashboard: null,
      snapshotTotals: {
        totalIncomeMonthly: 28000,
        totalExpensesMonthly: 19000,
        totalSavingsMonthly: 4000,
        totalDebtPaymentsMonthly: 2000,
        finalBalanceMonthly: 3000,
      },
    };

    const result = buildDashboardTerms(dto);

    expect(result.terms.carryOver).toBe(0);
    expect(result.terms.remaining).toBe(3000); // backend finalBalanceMonthly
    expect(result.computedRemaining).toBe(3000);
    expect(result.reconciles).toBe(true);
  });
});

describe("buildDashboardTerms — skipped month", () => {
  it("returns zeroed terms that trivially reconcile", () => {
    const dto: BudgetDashboardMonthDto = {
      currencyCode: "SEK",
      month: {
        yearMonth: "2026-03",
        status: "skipped",
        carryOverMode: "full",
        carryOverAmount: null,
        isCloseWindowOpen: false,
        closeWindowOpensAtUtc: null,
        closeEligibleAtUtc: null,
        isOverdueForClose: false,
      },
      liveDashboard: null,
      snapshotTotals: null,
    };

    const result = buildDashboardTerms(dto);

    expect(result.terms).toEqual({
      income: 0,
      carryOver: 0,
      expenses: 0,
      savings: 0,
      debts: 0,
      remaining: 0,
    });
    expect(result.computedRemaining).toBe(0);
    expect(result.reconciles).toBe(true);
  });
});
