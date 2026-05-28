import { describe, expect, it } from "vitest";

import {
  buildExpensePlanComparison,
  type ExpensePlanComparisonInput,
} from "./expensePlanComparison";

function makeInput(
  overrides: Partial<ExpensePlanComparisonInput> = {},
): ExpensePlanComparisonInput {
  return {
    sourceExpenseItemId: "source-id",
    name: "Rent",
    categoryId: "cat-a",
    amountMonthly: 1000,
    isActive: true,
    subscriptionLifecycleStatus: null,
    isSubscription: false,
    sourceName: "Rent",
    sourceCategoryId: "cat-a",
    sourceAmountMonthly: 1000,
    sourceIsActive: true,
    ...overrides,
  };
}

describe("buildExpensePlanComparison", () => {
  it("returns no plan link for month-only rows", () => {
    const result = buildExpensePlanComparison(
      makeInput({
        sourceExpenseItemId: null,
        sourceName: null,
        sourceCategoryId: null,
        sourceAmountMonthly: null,
        sourceIsActive: null,
        amountMonthly: 750,
      }),
    );

    expect(result.hasPlanLink).toBe(false);
    expect(result.changedInMonth).toBe(false);
    expect(result.amountDelta).toBeNull();
    expect(result.sourceEffectiveAmount).toBeNull();
    // Current effective amount is still computed so the modal preview can
    // use it without an extra branch.
    expect(result.currentEffectiveAmount).toBe(750);
  });

  it("treats a linked row with missing source values as unlinked (defensive)", () => {
    // PR 5 guarantees source values are populated whenever
    // sourceExpenseItemId is non-null. This branch protects the UI if the
    // read model ever returns partial data — we'd rather hide the badge
    // than fabricate a comparison.
    const result = buildExpensePlanComparison(
      makeInput({
        sourceExpenseItemId: "source-id",
        sourceAmountMonthly: null,
      }),
    );

    expect(result.hasPlanLink).toBe(false);
    expect(result.amountDelta).toBeNull();
  });

  it("reports unchanged linked row as not changed and zero delta", () => {
    const result = buildExpensePlanComparison(makeInput());

    expect(result.hasPlanLink).toBe(true);
    expect(result.changedInMonth).toBe(false);
    expect(result.amountChanged).toBe(false);
    expect(result.nameChanged).toBe(false);
    expect(result.categoryChanged).toBe(false);
    expect(result.activeChanged).toBe(false);
    expect(result.amountDelta).toBe(0);
    expect(result.currentEffectiveAmount).toBe(1000);
    expect(result.sourceEffectiveAmount).toBe(1000);
  });

  it("flags amount-increased row and reports a positive delta", () => {
    const result = buildExpensePlanComparison(
      makeInput({ amountMonthly: 1300 }),
    );

    expect(result.changedInMonth).toBe(true);
    expect(result.amountChanged).toBe(true);
    expect(result.amountDelta).toBe(300);
  });

  it("flags amount-decreased row and reports a negative delta", () => {
    const result = buildExpensePlanComparison(
      makeInput({ amountMonthly: 700 }),
    );

    expect(result.amountChanged).toBe(true);
    expect(result.amountDelta).toBe(-300);
  });

  it("flags name change (ignoring surrounding whitespace) and category change", () => {
    const result = buildExpensePlanComparison(
      makeInput({
        name: "  Rent renamed  ",
        sourceName: "Rent",
        categoryId: "cat-b",
        sourceCategoryId: "cat-a",
      }),
    );

    expect(result.nameChanged).toBe(true);
    expect(result.categoryChanged).toBe(true);
    expect(result.changedInMonth).toBe(true);
  });

  it("treats whitespace-only name differences as not changed", () => {
    const result = buildExpensePlanComparison(
      makeInput({
        name: "  Rent ",
        sourceName: "Rent",
      }),
    );

    expect(result.nameChanged).toBe(false);
    expect(result.changedInMonth).toBe(false);
  });

  it("inactive current row against active source: changed, current contributes 0", () => {
    const result = buildExpensePlanComparison(
      makeInput({
        isActive: false,
        sourceIsActive: true,
        amountMonthly: 1000,
        sourceAmountMonthly: 1000,
      }),
    );

    expect(result.activeChanged).toBe(true);
    expect(result.changedInMonth).toBe(true);
    expect(result.currentEffectiveAmount).toBe(0);
    expect(result.sourceEffectiveAmount).toBe(1000);
    expect(result.amountDelta).toBe(-1000);
  });

  it("paused subscription vs active source: current contributes 0 even though amount equal", () => {
    // Plan rows have no lifecycle field — a paused/cancelled subscription
    // is a current-month exclusion only. PR 6 §3 calls this out
    // explicitly so the delta calculation does not double-count the row as
    // "still on plan" while the user has paused it.
    const result = buildExpensePlanComparison(
      makeInput({
        isSubscription: true,
        subscriptionLifecycleStatus: "paused",
        amountMonthly: 99,
        sourceAmountMonthly: 99,
        // amountMonthly and sourceAmount match — the only change here is
        // the lifecycle, which doesn't surface as `amountChanged`. The UI
        // still wants the negative delta so the row reads as "0 right now,
        // plan expected 99".
      }),
    );

    expect(result.amountChanged).toBe(false);
    expect(result.changedInMonth).toBe(true);
    expect(result.currentEffectiveAmount).toBe(0);
    expect(result.sourceEffectiveAmount).toBe(99);
    expect(result.amountDelta).toBe(-99);
  });

  it("cancelled subscription vs active source: same treatment as paused", () => {
    const result = buildExpensePlanComparison(
      makeInput({
        isSubscription: true,
        subscriptionLifecycleStatus: "cancelled",
        amountMonthly: 49,
        sourceAmountMonthly: 49,
      }),
    );

    expect(result.currentEffectiveAmount).toBe(0);
    expect(result.changedInMonth).toBe(true);
    expect(result.amountDelta).toBe(-49);
  });

  it("active subscription with no lifecycle counts in current effective amount", () => {
    const result = buildExpensePlanComparison(
      makeInput({
        isSubscription: true,
        subscriptionLifecycleStatus: null,
        amountMonthly: 49,
        sourceAmountMonthly: 49,
      }),
    );

    expect(result.currentEffectiveAmount).toBe(49);
    expect(result.amountDelta).toBe(0);
  });

  it("source inactive vs current active reports change and a positive delta", () => {
    const result = buildExpensePlanComparison(
      makeInput({
        isActive: true,
        sourceIsActive: false,
        amountMonthly: 200,
        sourceAmountMonthly: 200,
      }),
    );

    expect(result.activeChanged).toBe(true);
    expect(result.currentEffectiveAmount).toBe(200);
    expect(result.sourceEffectiveAmount).toBe(0);
    expect(result.amountDelta).toBe(200);
  });
});
