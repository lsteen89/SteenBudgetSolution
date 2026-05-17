import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BudgetMonthSavingsGoalEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import {
  aggregateSavingsHero,
  deriveSavingsGoal,
  getMonthStartDate,
  PLANNED_MARKER_MIN_DISTANCE,
  shouldRenderPlannedMarker,
} from "./savingsSoul";

const buildRow = (
  overrides: Partial<BudgetMonthSavingsGoalEditorRowDto> = {},
): BudgetMonthSavingsGoalEditorRowDto => ({
  id: "row-1",
  sourceSavingsGoalId: "src-1",
  name: "Iceland trip",
  targetAmount: 35000,
  targetDate: "2026-09-30",
  amountSaved: 22400,
  monthlyContribution: 4200,
  status: "active",
  isDeleted: false,
  isMonthOnly: false,
  canUpdateDefault: true,
  ...overrides,
});

describe("getMonthStartDate", () => {
  it("returns the first day of the given month in local time", () => {
    const date = getMonthStartDate("2026-04");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(3);
    expect(date.getDate()).toBe(1);
  });

  it("returns an invalid date for malformed input", () => {
    expect(Number.isNaN(getMonthStartDate("not-a-month").getTime())).toBe(true);
    expect(Number.isNaN(getMonthStartDate("2026-13").getTime())).toBe(true);
    expect(Number.isNaN(getMonthStartDate("").getTime())).toBe(true);
  });
});

describe("shouldRenderPlannedMarker", () => {
  it("renders when planned/actual diverge by the threshold", () => {
    expect(shouldRenderPlannedMarker(0.5, 0.5 + PLANNED_MARKER_MIN_DISTANCE)).toBe(true);
    expect(shouldRenderPlannedMarker(0.9, 0.5)).toBe(true);
  });

  it("hides when planned/actual are within the threshold", () => {
    expect(shouldRenderPlannedMarker(0.5, 0.51)).toBe(false);
    expect(shouldRenderPlannedMarker(0.5, 0.5)).toBe(false);
  });

  it("hides for null / NaN values", () => {
    expect(shouldRenderPlannedMarker(null, 0.5)).toBe(false);
    expect(shouldRenderPlannedMarker(0.5, null)).toBe(false);
    expect(shouldRenderPlannedMarker(NaN, 0.5)).toBe(false);
    expect(shouldRenderPlannedMarker(0.5, NaN)).toBe(false);
  });
});

describe("deriveSavingsGoal", () => {
  it("uses the explicit reference date, not the system clock", () => {
    const row = buildRow({
      targetAmount: 12000,
      targetDate: "2026-12-31",
      amountSaved: 6000,
      monthlyContribution: 1000,
    });

    const apr2026 = deriveSavingsGoal(row, getMonthStartDate("2026-04"));
    const oct2026 = deriveSavingsGoal(row, getMonthStartDate("2026-10"));

    expect(apr2026.expectedPct).not.toBeNull();
    expect(oct2026.expectedPct).not.toBeNull();
    expect(apr2026.expectedPct).not.toBe(oct2026.expectedPct);
    // monthsRemaining is independent of reference (pace-based) and stable.
    expect(apr2026.monthsRemaining).toBe(oct2026.monthsRemaining);
  });

  it("falls back to ongoing when the reference date is invalid", () => {
    const row = buildRow();
    const result = deriveSavingsGoal(row, new Date(NaN));
    expect(result.tone).toBe("ongoing");
    expect(result.expectedPct).toBeNull();
  });

  it("treats goals with no target as ongoing", () => {
    const row = buildRow({ targetAmount: null, targetDate: null });
    const result = deriveSavingsGoal(row, getMonthStartDate("2026-04"));
    expect(result.tone).toBe("ongoing");
    expect(result.expectedPct).toBeNull();
    expect(result.actualPct).toBeNull();
  });
});

describe("aggregateSavingsHero", () => {
  const reference = getMonthStartDate("2026-04");

  it("is deterministic with respect to the system clock", () => {
    vi.useFakeTimers();
    try {
      const rows = [
        buildRow({
          id: "a",
          name: "Vacation Fund",
          targetAmount: 60000,
          targetDate: "2027-07-31",
          amountSaved: 15000,
          monthlyContribution: 3000,
        }),
      ];

      vi.setSystemTime(new Date("2020-01-01T00:00:00Z"));
      const past = aggregateSavingsHero(rows, reference);

      vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
      const future = aggregateSavingsHero(rows, reference);

      expect(past).toEqual(future);
      expect(past.nextMilestone).toEqual({
        goalName: "Vacation Fund",
        months: 15,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("names the nearest valid milestone across multiple goals", () => {
    const rows = [
      buildRow({
        id: "far",
        name: "Wedding",
        targetAmount: 90000,
        targetDate: "2027-06-01",
        amountSaved: 18000,
        monthlyContribution: 6000,
      }),
      buildRow({
        id: "near",
        name: "Vacation Fund",
        targetAmount: 12000,
        targetDate: "2026-12-01",
        amountSaved: 6000,
        monthlyContribution: 2000,
      }),
    ];

    const aggregate = aggregateSavingsHero(rows, reference);
    expect(aggregate.nextMilestone?.goalName).toBe("Vacation Fund");
  });

  describe("does not produce a milestone when data is incomplete", () => {
    const cases: [string, Partial<BudgetMonthSavingsGoalEditorRowDto>][] = [
      ["empty goal name", { name: "" }],
      ["whitespace goal name", { name: "   " }],
      ["missing target date", { targetDate: null }],
      ["invalid target date string", { targetDate: "not-a-date" }],
      ["non-positive target amount", { targetAmount: 0 }],
      ["null target amount", { targetAmount: null }],
      ["zero monthly contribution", { monthlyContribution: 0 }],
      ["negative monthly contribution", { monthlyContribution: -100 }],
      [
        "already-reached target (no remaining)",
        { amountSaved: 35000, targetAmount: 35000 },
      ],
      [
        "over-saved target (negative remaining)",
        { amountSaved: 50000, targetAmount: 35000 },
      ],
    ];

    for (const [label, overrides] of cases) {
      it(label, () => {
        const row = buildRow(overrides);
        const aggregate = aggregateSavingsHero([row], reference);
        expect(aggregate.nextMilestone).toBeNull();
      });
    }
  });

  it("hasPlannedMarker mirrors the shouldRenderPlannedMarker predicate", () => {
    // On-pace goal: actual ≈ expected → marker hidden → hasPlannedMarker false
    const onPace = buildRow({
      targetAmount: 12000,
      targetDate: "2027-04-01",
      // 12 months from reference (apr 2026) at 1000/mo, saved 0 → expected ≈ 0, actual = 0
      amountSaved: 0,
      monthlyContribution: 1000,
    });
    const onPaceAgg = aggregateSavingsHero([onPace], reference);
    expect(onPaceAgg.hasPlannedMarker).toBe(false);

    // Ahead goal: large divergence → marker visible → hasPlannedMarker true
    const ahead = buildRow({
      id: "ahead",
      targetAmount: 12000,
      targetDate: "2027-04-01",
      amountSaved: 10000,
      monthlyContribution: 1000,
    });
    const aheadAgg = aggregateSavingsHero([ahead], reference);
    expect(aheadAgg.hasPlannedMarker).toBe(true);
  });

  it("treats ongoing goals as having no planned marker", () => {
    const ongoing = buildRow({
      targetAmount: null,
      targetDate: null,
    });
    const aggregate = aggregateSavingsHero([ongoing], reference);
    expect(aggregate.hasPlannedMarker).toBe(false);
    expect(aggregate.nextMilestone).toBeNull();
  });
});

beforeEach(() => {
  // Defensive: ensure no fake timers leak across tests.
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});
