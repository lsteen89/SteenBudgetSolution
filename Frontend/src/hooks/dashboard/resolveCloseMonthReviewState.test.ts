import { describe, expect, it } from "vitest";

import {
  normalizeCloseMonthRemainingToSpend,
  resolveCloseMonthReviewState,
} from "./resolveCloseMonthReviewState";

describe("resolveCloseMonthReviewState", () => {
  it("resolves exact zero to the balanced state", () => {
    expect(
      resolveCloseMonthReviewState({ remainingToSpend: 0 }),
    ).toMatchObject({
      state: "balanced",
      normalizedRemainingToSpend: 0,
    });
  });

  it("resolves positive remaining to the positiveRemaining state", () => {
    expect(
      resolveCloseMonthReviewState({ remainingToSpend: 245.5 }),
    ).toMatchObject({
      state: "positiveRemaining",
      normalizedRemainingToSpend: 245.5,
    });
  });

  it("resolves negative remaining to the negativeRemaining state", () => {
    expect(
      resolveCloseMonthReviewState({ remainingToSpend: -312.75 }),
    ).toMatchObject({
      state: "negativeRemaining",
      normalizedRemainingToSpend: -312.75,
    });
  });

  it("normalizes near-zero values to zero", () => {
    expect(normalizeCloseMonthRemainingToSpend(0.004)).toBe(0);
    expect(normalizeCloseMonthRemainingToSpend(-0.004)).toBe(0);
    expect(
      resolveCloseMonthReviewState({ remainingToSpend: -0.004 }),
    ).toMatchObject({
      state: "balanced",
      normalizedRemainingToSpend: 0,
    });
  });
});
