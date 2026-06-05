// Debt Polish PR 2: client-side mirror of the PR 1 backend formula in
// `Backend/Application/Services/Debts/DebtMonthlyPaymentBreakdownCalculator.cs`.
//
// This helper exists ONLY for dirty-form previews — before save, the user is
// typing values that have not reached the backend yet, so the read model's
// `paymentBreakdown` field is stale by definition. After save, the parent
// invalidates the editor query and the row redraws from the authoritative
// backend value; this helper is never used to render committed state.
//
// Keep the formula and rounding behaviour identical to the backend. The
// unit tests pin the contract to the same PO examples the backend tests
// cover so any future divergence breaks the suite, not the user's trust.

import type { DebtMonthlyPaymentBreakdownDto } from "@/types/budget/DebtEditorDto";

export type DebtPaymentBreakdownInputs = {
  currentBalance: number;
  annualInterestPercent: number;
  monthlyFee: number | null;
  plannedMonthlyPayment: number;
};

/**
 * Compute the monthly payment breakdown for an unsaved set of debt inputs.
 * Mirrors `DebtMonthlyPaymentBreakdownCalculator.Calculate` exactly:
 *
 *   monthlyInterest = currentBalance * apr / 100 / 12
 *   monthlyFee      = configured monthly fee, null treated as 0
 *   principal       = max(plannedPayment - interest - fee, 0)
 *   projected       = max(currentBalance - principal, 0)
 *
 * Inputs are clamped to non-negative before any math, matching the backend's
 * defensive clamping. Rounding is 2-decimal away-from-zero, matching the
 * backend's `MidpointRounding.AwayFromZero`.
 */
export function calcDebtPaymentBreakdown(
  inputs: DebtPaymentBreakdownInputs,
): DebtMonthlyPaymentBreakdownDto {
  const balance = clampNonNegative(inputs.currentBalance);
  const apr = clampNonNegative(inputs.annualInterestPercent);
  const fee = clampNonNegative(inputs.monthlyFee ?? 0);
  const payment = clampNonNegative(inputs.plannedMonthlyPayment);

  const rawInterest = (balance * apr) / 100 / 12;
  const interest = round2(rawInterest);
  const feeRounded = round2(fee);
  const paymentRounded = round2(payment);

  let principal = paymentRounded - interest - feeRounded;
  if (principal < 0) principal = 0;
  principal = round2(principal);

  let projected = balance - principal;
  if (projected < 0) projected = 0;
  projected = round2(projected);

  const requirement = round2(interest + feeRounded);
  const coversInterestAndFees = paymentRounded >= requirement;
  const interestAndFeeShortfall = coversInterestAndFees
    ? 0
    : round2(requirement - paymentRounded);

  return {
    plannedMonthlyPayment: paymentRounded,
    monthlyInterest: interest,
    monthlyFee: feeRounded,
    principalPayment: principal,
    projectedBalanceAfterMonth: projected,
    coversInterestAndFees,
    interestAndFeeShortfall,
  };
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value;
}

/**
 * 2-decimal away-from-zero rounding that matches the backend's
 * `Math.Round(value, 2, MidpointRounding.AwayFromZero)`. The
 * `Number.EPSILON` nudge absorbs IEEE-754 representation error so values
 * like `0.005` round up to `0.01` rather than getting trapped as `0.00`.
 * All inputs are non-negative at the call site so we never need to handle
 * the negative-half case.
 */
function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
