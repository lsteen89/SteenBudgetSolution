import { describe, expect, it } from "vitest";

import type { DashboardTerms } from "./dashboardTerms";
import { buildNextMonthDeltas, deriveNextMonthPageState } from "./nextMonthPreview";

describe("deriveNextMonthPageState", () => {
  it("returns unavailable when there is no open month", () => {
    expect(
      deriveNextMonthPageState({
        openMonthYearMonth: null,
        months: [],
      }),
    ).toEqual({
      kind: "unavailable",
      fromYearMonth: null,
      targetYearMonth: null,
      targetMonth: null,
    });
  });

  it("returns preview when the immediate next month is not persisted", () => {
    expect(
      deriveNextMonthPageState({
        openMonthYearMonth: "2026-05",
        months: [{ yearMonth: "2026-05", status: "open", openedAt: "", closedAt: null }],
      }).kind,
    ).toBe("preview");
  });

  it("returns planned when the immediate next month is planned", () => {
    const state = deriveNextMonthPageState({
      openMonthYearMonth: "2026-05",
      months: [
        { yearMonth: "2026-05", status: "open", openedAt: "", closedAt: null },
        { yearMonth: "2026-06", status: "planned", openedAt: "", closedAt: null },
      ],
    });

    expect(state.kind).toBe("planned");
    expect(state.targetYearMonth).toBe("2026-06");
  });

  it("returns open when the immediate next month is already open", () => {
    const state = deriveNextMonthPageState({
      openMonthYearMonth: "2026-05",
      months: [
        { yearMonth: "2026-05", status: "open", openedAt: "", closedAt: null },
        { yearMonth: "2026-06", status: "open", openedAt: "", closedAt: null },
      ],
    });

    expect(state.kind).toBe("open");
    expect(state.targetYearMonth).toBe("2026-06");
  });
});

describe("buildNextMonthDeltas", () => {
  const terms = (overrides: Partial<DashboardTerms>): DashboardTerms => ({
    income: 51700,
    carryOver: 1200,
    expenses: 24377,
    savings: 8000,
    debts: 4500,
    remaining: 16023,
    ...overrides,
  });

  it("subtracts current from next per term, in equation order", () => {
    const deltas = buildNextMonthDeltas(
      terms({}),
      terms({
        income: 49100, // freelance not in the plan
        carryOver: 16023, // this month's free balance rolls forward
        expenses: 23200,
        remaining: 29423,
      }),
    );

    expect(deltas.map((d) => d.key)).toEqual([
      "income",
      "carryOver",
      "expenses",
      "savings",
      "debts",
    ]);
    expect(deltas.find((d) => d.key === "income")).toMatchObject({
      current: 51700,
      next: 49100,
      delta: -2600,
      isZero: false,
    });
    expect(deltas.find((d) => d.key === "carryOver")).toMatchObject({
      delta: 14823,
      isZero: false,
    });
    expect(deltas.find((d) => d.key === "expenses")).toMatchObject({
      delta: -1177,
      isZero: false,
    });
  });

  it("flags unchanged terms as zero so chips can hide them", () => {
    const deltas = buildNextMonthDeltas(terms({}), terms({}));
    expect(deltas.every((d) => d.isZero)).toBe(true);
    expect(deltas.every((d) => d.delta === 0)).toBe(true);
  });

  it("treats sub-half-öre drift as zero", () => {
    const deltas = buildNextMonthDeltas(
      terms({}),
      terms({ savings: 8000.004 }),
    );
    expect(deltas.find((d) => d.key === "savings")?.isZero).toBe(true);
  });

  it("never exposes a remaining row — remaining is the headline, not a delta", () => {
    const deltas = buildNextMonthDeltas(terms({}), terms({ remaining: 0 }));
    expect(deltas.some((d) => (d.key as string) === "remaining")).toBe(false);
  });
});
