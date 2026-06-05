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

  // ----------------------------------------- MVP cleanup: explicit sum proof
  //
  // The MVP task ships with a worked example the user actually sees on the
  // page:
  //
  //   Månadsbetalningar: 1 750 kr
  //   Ränta            : 1 239 kr
  //   Avgift           :   250 kr
  //   Minskar skulden  :   261 kr
  //
  //   1 239 + 250 + 261 === 1 750
  //
  // We pin the exact scenario that produces those numbers (balance 150 000,
  // APR 9.912 %, fee 250, planned payment 1 750) so a future drift between
  // the displayed split and the planned-payment total is a CI failure, not
  // a user-spotted bug.

  it("displayed breakdown sums to the planned payment (1239 + 250 + 261 = 1750)", () => {
    const inputs = {
      currentBalance: 150_000,
      annualInterestPercent: 9.912,
      monthlyFee: 250,
      plannedMonthlyPayment: 1_750,
    };

    const result = calcDebtPaymentBreakdown(inputs);

    // The three displayed cells.
    expect(result.monthlyInterest).toBe(1239);
    expect(result.monthlyFee).toBe(250);
    expect(result.principalPayment).toBe(261);

    // The visible identity: split adds up to the planned monthly payment.
    expect(
      result.monthlyInterest +
        result.monthlyFee +
        result.principalPayment,
    ).toBe(inputs.plannedMonthlyPayment);

    // Projected balance applies *only* the principal portion to the current
    // balance — never the gross payment.
    expect(result.projectedBalanceAfterMonth).toBe(
      inputs.currentBalance - result.principalPayment,
    );
    expect(result.projectedBalanceAfterMonth).toBe(149_739);

    expect(result.coversInterestAndFees).toBe(true);
    expect(result.interestAndFeeShortfall).toBe(0);
  });

  it("interest and fee changes shift the breakdown without mutating the input balance", () => {
    const baseInputs = {
      currentBalance: 150_000,
      annualInterestPercent: 9.912,
      monthlyFee: 250,
      plannedMonthlyPayment: 1_750,
    };

    const base = calcDebtPaymentBreakdown(baseInputs);

    // Same balance and payment, higher rate + higher fee but still inside
    // the "covers interest + fee" range so the sum identity holds.
    // 150 000 · 11 % / 12 = 1 375 interest; fee 275 → requirement 1 650;
    // payment 1 750 covers, principal = 100.
    const escalated = calcDebtPaymentBreakdown({
      ...baseInputs,
      annualInterestPercent: 11,
      monthlyFee: 275,
    });

    // Interest grew with the rate.
    expect(escalated.monthlyInterest).toBeGreaterThan(base.monthlyInterest);
    // Fee grew with the configured value.
    expect(escalated.monthlyFee).toBeGreaterThan(base.monthlyFee);
    // Principal shrank because more of the same planned payment is now
    // consumed by interest + fee.
    expect(escalated.principalPayment).toBeLessThan(base.principalPayment);
    // The calculator never mutates the input balance — `Kvar att betala` is
    // an authoritative liability snapshot and stays where it was. Projected
    // balance reflects the *smaller* principal reduction, so it ends higher
    // than the escalated principal would suggest if we had (wrongly)
    // applied the full payment.
    expect(escalated.projectedBalanceAfterMonth).toBe(
      baseInputs.currentBalance - escalated.principalPayment,
    );
    // Sanity: identity still holds at every step.
    expect(
      escalated.monthlyInterest +
        escalated.monthlyFee +
        escalated.principalPayment,
    ).toBe(baseInputs.plannedMonthlyPayment);
  });

  it("payment <= interest + fee pins principal to zero and projected balance to the unchanged current balance", () => {
    const inputs = {
      currentBalance: 150_000,
      annualInterestPercent: 9.912,
      monthlyFee: 250,
      // Below the 1 489 kr requirement — the user is short.
      plannedMonthlyPayment: 1_000,
    };

    const result = calcDebtPaymentBreakdown(inputs);

    expect(result.monthlyInterest).toBe(1239);
    expect(result.monthlyFee).toBe(250);
    // No principal reduction — the planned payment is consumed entirely by
    // interest + fee (and then some).
    expect(result.principalPayment).toBe(0);
    // Projected balance equals the unchanged current balance — the UI must
    // never pretend the debt decreased this month.
    expect(result.projectedBalanceAfterMonth).toBe(inputs.currentBalance);
    expect(result.coversInterestAndFees).toBe(false);
    expect(result.interestAndFeeShortfall).toBe(489);
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
