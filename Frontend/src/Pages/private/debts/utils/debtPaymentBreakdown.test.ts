import { describe, expect, it } from "vitest";
import { calcDebtPaymentBreakdown } from "./debtPaymentBreakdown";

// These cases mirror the PR 1 backend acceptance examples and the
// `DebtMonthlyPaymentBreakdownCalculator` unit tests so a future drift
// between the FE preview and the BE read-model surfaces in CI before it
// reaches a user.

describe("calcDebtPaymentBreakdown", () => {
  it("matches the PO baseline example (10.99% APR, 130 kr fee)", () => {
    const result = calcDebtPaymentBreakdown({
      currentBalance: 93000,
      annualInterestPercent: 10.99,
      monthlyFee: 130,
      plannedMonthlyPayment: 1550,
    });

    expect(result.monthlyInterest).toBe(851.73);
    expect(result.monthlyFee).toBe(130);
    expect(result.principalPayment).toBe(568.27);
    expect(result.projectedBalanceAfterMonth).toBe(92431.73);
    expect(result.coversInterestAndFees).toBe(true);
    expect(result.interestAndFeeShortfall).toBe(0);
  });

  it("matches the PO 'after edit' example (12.99% APR, 149.99 kr fee)", () => {
    const result = calcDebtPaymentBreakdown({
      currentBalance: 93000,
      annualInterestPercent: 12.99,
      monthlyFee: 149.99,
      plannedMonthlyPayment: 1550,
    });

    expect(result.monthlyInterest).toBe(1006.73);
    expect(result.monthlyFee).toBe(149.99);
    expect(result.principalPayment).toBe(393.28);
    expect(result.projectedBalanceAfterMonth).toBe(92606.72);
    expect(result.coversInterestAndFees).toBe(true);
    expect(result.interestAndFeeShortfall).toBe(0);
  });

  it("treats a null monthly fee as zero so optional fees do not break the formula", () => {
    const result = calcDebtPaymentBreakdown({
      currentBalance: 10000,
      annualInterestPercent: 12,
      monthlyFee: null,
      plannedMonthlyPayment: 500,
    });

    expect(result.monthlyFee).toBe(0);
    expect(result.monthlyInterest).toBe(100);
    expect(result.principalPayment).toBe(400);
    expect(result.projectedBalanceAfterMonth).toBe(9600);
    expect(result.coversInterestAndFees).toBe(true);
  });

  it("returns zero everywhere when the balance is zero so a paid-off row preview is calm", () => {
    const result = calcDebtPaymentBreakdown({
      currentBalance: 0,
      annualInterestPercent: 12,
      monthlyFee: 25,
      plannedMonthlyPayment: 0,
    });

    expect(result.monthlyInterest).toBe(0);
    expect(result.monthlyFee).toBe(25);
    expect(result.principalPayment).toBe(0);
    expect(result.projectedBalanceAfterMonth).toBe(0);
    // payment 0 < requirement 25 -> advisory triggers
    expect(result.coversInterestAndFees).toBe(false);
    expect(result.interestAndFeeShortfall).toBe(25);
  });

  it("flags shortfall and pins principal to zero when payment cannot cover interest + fee", () => {
    const result = calcDebtPaymentBreakdown({
      currentBalance: 50000,
      annualInterestPercent: 24,
      monthlyFee: 50,
      // Interest = 1000, fee = 50, requirement = 1050; payment = 800.
      plannedMonthlyPayment: 800,
    });

    expect(result.monthlyInterest).toBe(1000);
    expect(result.monthlyFee).toBe(50);
    expect(result.principalPayment).toBe(0);
    // Projected stays equal to the current balance — no reduction this month.
    expect(result.projectedBalanceAfterMonth).toBe(50000);
    expect(result.coversInterestAndFees).toBe(false);
    expect(result.interestAndFeeShortfall).toBe(250);
  });

  it("clamps negative inputs to zero rather than producing negative breakdown values", () => {
    const result = calcDebtPaymentBreakdown({
      currentBalance: -100,
      annualInterestPercent: -5,
      monthlyFee: -10,
      plannedMonthlyPayment: -1,
    });

    expect(result.monthlyInterest).toBe(0);
    expect(result.monthlyFee).toBe(0);
    expect(result.principalPayment).toBe(0);
    expect(result.projectedBalanceAfterMonth).toBe(0);
    expect(result.coversInterestAndFees).toBe(true);
    expect(result.interestAndFeeShortfall).toBe(0);
  });

  it("handles non-finite inputs without throwing", () => {
    const result = calcDebtPaymentBreakdown({
      currentBalance: Number.NaN,
      annualInterestPercent: Number.POSITIVE_INFINITY,
      monthlyFee: Number.NaN,
      plannedMonthlyPayment: Number.NaN,
    });

    expect(result.monthlyInterest).toBe(0);
    expect(result.monthlyFee).toBe(0);
    expect(result.principalPayment).toBe(0);
    expect(result.projectedBalanceAfterMonth).toBe(0);
    expect(result.coversInterestAndFees).toBe(true);
  });
});
