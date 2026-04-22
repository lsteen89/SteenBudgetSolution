import type { CloseMonthReviewState } from "./closeMonth.types";

const ZERO_THRESHOLD = 0.005;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function normalizeCloseMonthRemainingToSpend(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) < ZERO_THRESHOLD) {
    return 0;
  }

  return round2(value);
}

export function resolveCloseMonthReviewState(input: {
  remainingToSpend: number;
}): CloseMonthReviewState {
  const normalizedRemainingToSpend = normalizeCloseMonthRemainingToSpend(
    input.remainingToSpend,
  );

  if (normalizedRemainingToSpend === 0) {
    return {
      state: "balanced",
      normalizedRemainingToSpend,
      canMoveToEmergencyFund: false,
    };
  }

  if (normalizedRemainingToSpend > 0) {
    return {
      state: "positiveRemaining",
      normalizedRemainingToSpend,
      canMoveToEmergencyFund: false,
    };
  }

  return {
    state: "negativeRemaining",
    normalizedRemainingToSpend,
    canMoveToEmergencyFund: false,
  };
}
