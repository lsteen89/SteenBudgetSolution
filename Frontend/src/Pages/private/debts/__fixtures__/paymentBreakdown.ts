// Debt Polish PR 1: test fixture for `paymentBreakdown` on the PR 5 editor
// row DTO. Centralized so adding a field on the backend touches one place.
//
// Defaults to a "harmless" all-zero breakdown that satisfies the typed
// contract without polluting visual assertions. Tests that exercise the
// breakdown surface itself should pass an explicit override instead of
// relying on the defaults.

import type { DebtMonthlyPaymentBreakdownDto } from "@/types/budget/DebtEditorDto";

export const emptyPaymentBreakdown: DebtMonthlyPaymentBreakdownDto = {
  plannedMonthlyPayment: 0,
  monthlyInterest: 0,
  monthlyFee: 0,
  principalPayment: 0,
  projectedBalanceAfterMonth: 0,
  coversInterestAndFees: true,
  interestAndFeeShortfall: 0,
};

export function paymentBreakdown(
  overrides: Partial<DebtMonthlyPaymentBreakdownDto> = {},
): DebtMonthlyPaymentBreakdownDto {
  return { ...emptyPaymentBreakdown, ...overrides };
}
