import { describe, expect, it } from "vitest";

import type { DashboardTerms } from "./dashboardTerms";
import {
  QUICK_EDIT_DOMAIN_SIGN,
  quickEditBaseFree,
  quickEditProjectedDelta,
  quickEditProjectedFree,
} from "./quickEditProjection";

function buildTerms(overrides?: Partial<DashboardTerms>): DashboardTerms {
  const income = overrides?.income ?? 30000;
  const carryOver = overrides?.carryOver ?? 500;
  const expenses = overrides?.expenses ?? 18000;
  const savings = overrides?.savings ?? 4000;
  const debts = overrides?.debts ?? 2000;
  const remaining =
    overrides?.remaining ?? income + carryOver - expenses - savings - debts;

  return { income, carryOver, expenses, savings, debts, remaining };
}

describe("QUICK_EDIT_DOMAIN_SIGN", () => {
  it("treats income as additive and the other three domains as subtractive", () => {
    expect(QUICK_EDIT_DOMAIN_SIGN.income).toBe(1);
    expect(QUICK_EDIT_DOMAIN_SIGN.expenses).toBe(-1);
    expect(QUICK_EDIT_DOMAIN_SIGN.savings).toBe(-1);
    expect(QUICK_EDIT_DOMAIN_SIGN.debts).toBe(-1);
  });
});

describe("quickEditBaseFree", () => {
  it("returns the dashboard's authoritative remaining", () => {
    const terms = buildTerms({ remaining: 6500 });
    expect(quickEditBaseFree(terms)).toBe(6500);
  });

  it("does not re-derive remaining from the other terms", () => {
    // Even if the backend's remaining disagrees with the naive sum (rounding,
    // policy), baseFree mirrors the backend so the UI cannot drift.
    const terms = buildTerms({ remaining: 7000 });
    expect(quickEditBaseFree(terms)).toBe(7000);
  });

  it("coerces non-finite remaining to zero", () => {
    const terms = buildTerms({ remaining: Number.NaN });
    expect(quickEditBaseFree(terms)).toBe(0);
  });
});

describe("quickEditProjectedDelta", () => {
  it("returns +Δ for an income increase", () => {
    expect(quickEditProjectedDelta("income", 1000, 1500)).toBe(500);
  });

  it("returns −Δ for an income decrease", () => {
    expect(quickEditProjectedDelta("income", 1500, 1000)).toBe(-500);
  });

  it("returns −Δ for an expense increase", () => {
    expect(quickEditProjectedDelta("expenses", 2000, 2300)).toBe(-300);
  });

  it("returns +Δ for an expense decrease", () => {
    expect(quickEditProjectedDelta("expenses", 2300, 2000)).toBe(300);
  });

  it("returns −Δ for a savings increase", () => {
    expect(quickEditProjectedDelta("savings", 1000, 1250)).toBe(-250);
  });

  it("returns −Δ for a debt increase", () => {
    expect(quickEditProjectedDelta("debts", 800, 1000)).toBe(-200);
  });

  it("returns 0 when the draft matches the base", () => {
    expect(quickEditProjectedDelta("income", 1000, 1000)).toBe(0);
    expect(quickEditProjectedDelta("expenses", 2000, 2000)).toBe(0);
    expect(quickEditProjectedDelta("savings", 500, 500)).toBe(0);
    expect(quickEditProjectedDelta("debts", 300, 300)).toBe(0);
  });

  it("rounds to öre to absorb IEEE 754 drift", () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JS
    expect(quickEditProjectedDelta("income", 0.1, 0.3)).toBeCloseTo(0.2, 2);
    expect(quickEditProjectedDelta("income", 0, 0.1 + 0.2)).toBe(0.3);
  });

  it("coerces non-finite inputs to zero", () => {
    expect(quickEditProjectedDelta("income", Number.NaN, 100)).toBe(100);
    expect(quickEditProjectedDelta("expenses", 100, Number.NaN)).toBe(100);
  });
});

describe("quickEditProjectedFree", () => {
  it("raises free money when income increases", () => {
    const terms = buildTerms({ remaining: 6500 });
    expect(quickEditProjectedFree(terms, "income", 1000, 1500)).toBe(7000);
  });

  it("lowers free money when expenses increase", () => {
    const terms = buildTerms({ remaining: 6500 });
    expect(quickEditProjectedFree(terms, "expenses", 2000, 2300)).toBe(6200);
  });

  it("lowers free money when savings increase", () => {
    const terms = buildTerms({ remaining: 6500 });
    expect(quickEditProjectedFree(terms, "savings", 1000, 1250)).toBe(6250);
  });

  it("lowers free money when debts increase", () => {
    const terms = buildTerms({ remaining: 6500 });
    expect(quickEditProjectedFree(terms, "debts", 800, 1000)).toBe(6300);
  });

  it("keeps free money unchanged when the active domain has no draft delta", () => {
    const terms = buildTerms({ remaining: 6500 });
    expect(quickEditProjectedFree(terms, "expenses", 2000, 2000)).toBe(6500);
  });

  it("treats carry-over as its own term — it never folds into income", () => {
    // Carry-over of 1000 keeps remaining 1000 higher than a no-carry month.
    const withCarry = buildTerms({ remaining: 7500, carryOver: 1000 });
    const withoutCarry = buildTerms({ remaining: 6500, carryOver: 0 });

    expect(
      quickEditProjectedFree(withCarry, "income", 1000, 1500),
    ).toBe(8000);
    expect(
      quickEditProjectedFree(withoutCarry, "income", 1000, 1500),
    ).toBe(7000);
  });

  it("does not re-derive other domains from drafts (active-tab only)", () => {
    // The other terms in `terms` must not bleed into the projection. Only
    // the active domain's delta changes the output.
    const terms = buildTerms({
      income: 30000,
      expenses: 18000,
      savings: 4000,
      debts: 2000,
      carryOver: 500,
      remaining: 6500,
    });

    // Change savings draft but project for the expenses domain. The savings
    // draft must be ignored.
    expect(quickEditProjectedFree(terms, "expenses", 2000, 2100)).toBe(6400);
  });

  it("rounds to öre", () => {
    const terms = buildTerms({ remaining: 6500 });
    // 6500 + (0.1 + 0.2) - sign(+1) = 6500.3 expected for income.
    expect(quickEditProjectedFree(terms, "income", 0, 0.1 + 0.2)).toBe(
      6500.3,
    );
  });
});
