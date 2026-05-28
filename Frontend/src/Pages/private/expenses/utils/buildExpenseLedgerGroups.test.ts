import type { BudgetMonthEditorDto } from "@/types/budget/BudgetMonthsStatusDto";
import type { ExpenseCategoryDto } from "@/types/budget/ExpenseCategoryDto";
import { describe, expect, it } from "vitest";

import { buildExpenseLedgerGroups } from "./buildExpenseLedgerGroups";

const housingCategoryId = "11111111-1111-4111-8111-111111111111";
const fixedCategoryId = "11111111-1111-4111-8111-111111111112";
const foodCategoryId = "22222222-2222-4222-8222-222222222222";
const subscriptionCategoryId = "33333333-3333-4333-8333-333333333333";

const categories: ExpenseCategoryDto[] = [
  { id: housingCategoryId, name: "Housing", code: "housing" },
  { id: fixedCategoryId, name: "Fixed", code: "fixed" },
  { id: foodCategoryId, name: "Food", code: "food" },
  { id: subscriptionCategoryId, name: "Subscription", code: "subscription" },
];

type RowOverrides = {
  id?: string;
  name?: string;
  categoryId?: string;
  amountMonthly?: number;
  isActive?: boolean;
  isDeleted?: boolean;
  isMonthOnly?: boolean;
  canUpdateDefault?: boolean;
  sourceExpenseItemId?: string | null;
  subscriptionLifecycleStatus?: "active" | "paused" | "cancelled" | null;
  // PR 5 source-plan values. Tests that need a real plan comparison should
  // pass these explicitly; legacy tests can omit them and the row will be
  // treated as month-only by the comparison utility.
  sourceName?: string | null;
  sourceCategoryId?: string | null;
  sourceAmountMonthly?: number | null;
  sourceIsActive?: boolean | null;
};

function makeRow(overrides: RowOverrides = {}) {
  return {
    id: overrides.id ?? "row-" + Math.random().toString(36).slice(2, 8),
    sourceExpenseItemId: overrides.sourceExpenseItemId ?? null,
    categoryId: overrides.categoryId ?? housingCategoryId,
    name: overrides.name ?? "Row",
    amountMonthly: overrides.amountMonthly ?? 100,
    subscriptionLifecycleStatus: overrides.subscriptionLifecycleStatus ?? null,
    isActive: overrides.isActive ?? true,
    isDeleted: overrides.isDeleted ?? false,
    isMonthOnly: overrides.isMonthOnly ?? false,
    canUpdateDefault: overrides.canUpdateDefault ?? false,
    sourceName: overrides.sourceName ?? null,
    sourceCategoryId: overrides.sourceCategoryId ?? null,
    sourceAmountMonthly: overrides.sourceAmountMonthly ?? null,
    sourceIsActive: overrides.sourceIsActive ?? null,
  };
}

function makeEditor(
  expenseItems: ReturnType<typeof makeRow>[],
): BudgetMonthEditorDto {
  return {
    month: {
      budgetMonthId: "month-id",
      yearMonth: "2026-05",
      status: "open",
      isEditable: true,
      carryOverAmount: null,
      carryOverMode: "none",
    },
    expenseItems,
  } as unknown as BudgetMonthEditorDto;
}

function build(
  rows: ReturnType<typeof makeRow>[],
  overrideCategories: ExpenseCategoryDto[] = categories,
) {
  return buildExpenseLedgerGroups({
    editor: makeEditor(rows),
    categories: overrideCategories,
    locale: "en-US",
  });
}

function groupByKey(groups: ReturnType<typeof build>, key: string) {
  return groups.find((g) => g.key === key)!;
}

describe("buildExpenseLedgerGroups", () => {
  it("returns the three groups in fixed/variable/subscription order even when empty", () => {
    const groups = build([]);

    expect(groups.map((g) => g.key)).toEqual([
      "fixed",
      "variable",
      "subscription",
    ]);
    for (const g of groups) {
      expect(g.rows).toHaveLength(0);
      expect(g.activeRows).toHaveLength(0);
      expect(g.inactiveRows).toHaveLength(0);
      expect(g.activeTotal).toBe(0);
      expect(g.inactiveTotal).toBe(0);
      expect(g.activeCount).toBe(0);
      expect(g.inactiveCount).toBe(0);
      expect(g.monthOnlyCount).toBe(0);
      expect(g.changedCount).toBe(0);
      expect(g.largestActiveRow).toBeNull();
      expect(g.total).toBe(0);
    }
  });

  it("groups housing and fixed under fixed; food/transport/other under variable; subscription under subscription", () => {
    const groups = build([
      makeRow({ id: "h", categoryId: housingCategoryId, amountMonthly: 1000 }),
      makeRow({ id: "f", categoryId: fixedCategoryId, amountMonthly: 200 }),
      makeRow({ id: "fo", categoryId: foodCategoryId, amountMonthly: 400 }),
      makeRow({
        id: "s",
        categoryId: subscriptionCategoryId,
        amountMonthly: 99,
        subscriptionLifecycleStatus: "active",
      }),
    ]);

    expect(groupByKey(groups, "fixed").activeTotal).toBe(1200);
    expect(groupByKey(groups, "variable").activeTotal).toBe(400);
    expect(groupByKey(groups, "subscription").activeTotal).toBe(99);
  });

  it("excludes inactive rows from activeTotal and puts them in inactiveRows", () => {
    const groups = build([
      makeRow({ id: "a", categoryId: housingCategoryId, amountMonthly: 1000 }),
      makeRow({
        id: "b",
        categoryId: housingCategoryId,
        amountMonthly: 999,
        isActive: false,
      }),
    ]);
    const fixed = groupByKey(groups, "fixed");

    expect(fixed.activeTotal).toBe(1000);
    expect(fixed.inactiveTotal).toBe(999);
    expect(fixed.activeCount).toBe(1);
    expect(fixed.inactiveCount).toBe(1);
    expect(fixed.inactiveRows.map((r) => r.id)).toEqual(["b"]);
    expect(fixed.activeRows.map((r) => r.id)).toEqual(["a"]);
  });

  it("excludes paused and cancelled subscriptions from active totals", () => {
    const groups = build([
      makeRow({
        id: "active",
        categoryId: subscriptionCategoryId,
        amountMonthly: 99,
        subscriptionLifecycleStatus: "active",
      }),
      makeRow({
        id: "paused",
        categoryId: subscriptionCategoryId,
        amountMonthly: 50,
        subscriptionLifecycleStatus: "paused",
      }),
      makeRow({
        id: "cancelled",
        categoryId: subscriptionCategoryId,
        amountMonthly: 25,
        subscriptionLifecycleStatus: "cancelled",
      }),
    ]);
    const sub = groupByKey(groups, "subscription");

    expect(sub.activeTotal).toBe(99);
    expect(sub.inactiveTotal).toBe(75);
    expect(sub.activeCount).toBe(1);
    expect(sub.inactiveCount).toBe(2);

    const stateById = new Map(sub.rows.map((r) => [r.id, r.state] as const));
    expect(stateById.get("active")).toBe("active");
    expect(stateById.get("paused")).toBe("subscriptionPaused");
    expect(stateById.get("cancelled")).toBe("subscriptionCancelled");
  });

  it("does not include deleted rows in either active or inactive lists", () => {
    const groups = build([
      makeRow({ id: "live", categoryId: foodCategoryId, amountMonthly: 100 }),
      makeRow({
        id: "gone",
        categoryId: foodCategoryId,
        amountMonthly: 999,
        isDeleted: true,
      }),
    ]);
    const variable = groupByKey(groups, "variable");

    expect(variable.rows.map((r) => r.id)).toEqual(["live"]);
    expect(variable.activeTotal).toBe(100);
    expect(variable.inactiveTotal).toBe(0);
  });

  it("classifies rows as planLinked when SourceExpenseItemId is present and monthOnly otherwise", () => {
    const groups = build([
      makeRow({
        id: "plan",
        categoryId: foodCategoryId,
        isMonthOnly: false,
        sourceExpenseItemId: "source-id",
      }),
      makeRow({
        id: "month",
        categoryId: foodCategoryId,
        isMonthOnly: true,
        sourceExpenseItemId: null,
      }),
    ]);
    const variable = groupByKey(groups, "variable");

    const kindById = new Map(
      variable.rows.map((r) => [r.id, r.sourceKind] as const),
    );
    expect(kindById.get("plan")).toBe("planLinked");
    expect(kindById.get("month")).toBe("monthOnly");
    expect(variable.monthOnlyCount).toBe(1);
  });

  it("sets isSubscription only on subscription-group rows", () => {
    const groups = build([
      makeRow({ id: "h", categoryId: housingCategoryId }),
      makeRow({
        id: "s",
        categoryId: subscriptionCategoryId,
        subscriptionLifecycleStatus: "active",
      }),
    ]);

    expect(groupByKey(groups, "fixed").rows[0].isSubscription).toBe(false);
    expect(groupByKey(groups, "subscription").rows[0].isSubscription).toBe(
      true,
    );
  });

  it("manual inactive subscription is marked 'inactive' regardless of lifecycle 'active'", () => {
    // The user explicitly toggled isActive off. Lifecycle still says 'active'
    // (a quirky state), but the display should reflect the user's choice.
    const groups = build([
      makeRow({
        id: "x",
        categoryId: subscriptionCategoryId,
        isActive: false,
        subscriptionLifecycleStatus: "active",
        amountMonthly: 49,
      }),
    ]);
    const sub = groupByKey(groups, "subscription");

    expect(sub.activeTotal).toBe(0);
    expect(sub.inactiveCount).toBe(1);
    expect(sub.rows[0].state).toBe("inactive");
  });

  it("largestActiveRow returns the highest-amount active row, ignoring inactive ones", () => {
    const groups = build([
      makeRow({
        id: "small",
        categoryId: foodCategoryId,
        amountMonthly: 100,
      }),
      makeRow({
        id: "big",
        categoryId: foodCategoryId,
        amountMonthly: 500,
      }),
      makeRow({
        id: "biggestButInactive",
        categoryId: foodCategoryId,
        amountMonthly: 9999,
        isActive: false,
      }),
    ]);
    const variable = groupByKey(groups, "variable");

    expect(variable.largestActiveRow?.id).toBe("big");
  });

  it("largestActiveRow is null when there are no active rows", () => {
    const groups = build([
      makeRow({
        id: "off",
        categoryId: foodCategoryId,
        isActive: false,
        amountMonthly: 100,
      }),
    ]);

    expect(groupByKey(groups, "variable").largestActiveRow).toBeNull();
  });

  it("sorts rows active-first, then paused, cancelled, then explicit inactive", () => {
    const groups = build([
      makeRow({
        id: "cancelled",
        categoryId: subscriptionCategoryId,
        subscriptionLifecycleStatus: "cancelled",
        amountMonthly: 10,
      }),
      makeRow({
        id: "inactive",
        categoryId: subscriptionCategoryId,
        isActive: false,
        amountMonthly: 20,
      }),
      makeRow({
        id: "active",
        categoryId: subscriptionCategoryId,
        subscriptionLifecycleStatus: "active",
        amountMonthly: 30,
      }),
      makeRow({
        id: "paused",
        categoryId: subscriptionCategoryId,
        subscriptionLifecycleStatus: "paused",
        amountMonthly: 40,
      }),
    ]);

    expect(
      groupByKey(groups, "subscription").rows.map((r) => r.id),
    ).toEqual(["active", "paused", "cancelled", "inactive"]);
  });

  it("treats unknown category as variable (falls back to 'other')", () => {
    const groups = build(
      [makeRow({ id: "u", categoryId: "unknown-id", amountMonthly: 77 })],
      [],
    );

    expect(groupByKey(groups, "variable").activeTotal).toBe(77);
  });

  it("activeRows and inactiveRows are themselves sorted (active first, then paused → cancelled → inactive)", () => {
    // The UI renders activeRows / inactiveRows directly, so the same ordering
    // contract the test asserts on `rows` must also hold on those arrays.
    const groups = build([
      makeRow({
        id: "cancelled",
        categoryId: subscriptionCategoryId,
        subscriptionLifecycleStatus: "cancelled",
      }),
      makeRow({
        id: "inactive",
        categoryId: subscriptionCategoryId,
        isActive: false,
      }),
      makeRow({
        id: "active",
        categoryId: subscriptionCategoryId,
        subscriptionLifecycleStatus: "active",
      }),
      makeRow({
        id: "paused",
        categoryId: subscriptionCategoryId,
        subscriptionLifecycleStatus: "paused",
      }),
    ]);
    const sub = groupByKey(groups, "subscription");

    expect(sub.activeRows.map((r) => r.id)).toEqual(["active"]);
    expect(sub.inactiveRows.map((r) => r.id)).toEqual([
      "paused",
      "cancelled",
      "inactive",
    ]);
  });

  it("splits inactive bucket into pausedCount, cancelledCount, and manuallyInactiveCount", () => {
    const groups = build([
      makeRow({
        id: "p1",
        categoryId: subscriptionCategoryId,
        subscriptionLifecycleStatus: "paused",
      }),
      makeRow({
        id: "p2",
        categoryId: subscriptionCategoryId,
        subscriptionLifecycleStatus: "paused",
      }),
      makeRow({
        id: "c1",
        categoryId: subscriptionCategoryId,
        subscriptionLifecycleStatus: "cancelled",
      }),
      makeRow({
        id: "i1",
        categoryId: subscriptionCategoryId,
        isActive: false,
        subscriptionLifecycleStatus: "active",
      }),
      makeRow({
        id: "a",
        categoryId: subscriptionCategoryId,
        subscriptionLifecycleStatus: "active",
      }),
    ]);
    const sub = groupByKey(groups, "subscription");

    expect(sub.activeCount).toBe(1);
    expect(sub.inactiveCount).toBe(4);
    expect(sub.pausedCount).toBe(2);
    expect(sub.cancelledCount).toBe(1);
    expect(sub.manuallyInactiveCount).toBe(1);
  });

  it("a single cancelled subscription is reported as cancelled, not paused", () => {
    // Regression for the header-copy bug: previous code labelled the whole
    // inactive bucket as "paused" when the group was subscriptions.
    const groups = build([
      makeRow({
        id: "active",
        categoryId: subscriptionCategoryId,
        subscriptionLifecycleStatus: "active",
      }),
      makeRow({
        id: "gone",
        categoryId: subscriptionCategoryId,
        subscriptionLifecycleStatus: "cancelled",
      }),
    ]);
    const sub = groupByKey(groups, "subscription");

    expect(sub.pausedCount).toBe(0);
    expect(sub.cancelledCount).toBe(1);
    expect(sub.manuallyInactiveCount).toBe(0);
  });

  it("non-subscription groups only ever populate manuallyInactiveCount", () => {
    const groups = build([
      makeRow({ id: "a", categoryId: housingCategoryId }),
      makeRow({
        id: "off",
        categoryId: housingCategoryId,
        isActive: false,
      }),
    ]);
    const fixed = groupByKey(groups, "fixed");

    expect(fixed.pausedCount).toBe(0);
    expect(fixed.cancelledCount).toBe(0);
    expect(fixed.manuallyInactiveCount).toBe(1);
    expect(fixed.inactiveCount).toBe(1);
  });

  it("threads PR 5 source-plan values and a derived planComparison onto each row", () => {
    const groups = build([
      makeRow({
        id: "linked-changed",
        categoryId: housingCategoryId,
        amountMonthly: 1300,
        sourceExpenseItemId: "src-a",
        sourceName: "Rent",
        sourceCategoryId: housingCategoryId,
        sourceAmountMonthly: 1000,
        sourceIsActive: true,
      }),
      makeRow({
        id: "month-only",
        categoryId: housingCategoryId,
        amountMonthly: 250,
        // No source fields → comparison must report `hasPlanLink: false`.
      }),
    ]);
    const fixed = groupByKey(groups, "fixed");
    const byId = new Map(fixed.rows.map((r) => [r.id, r] as const));

    const linked = byId.get("linked-changed")!;
    expect(linked.sourceAmountMonthly).toBe(1000);
    expect(linked.planComparison.hasPlanLink).toBe(true);
    expect(linked.planComparison.changedInMonth).toBe(true);
    expect(linked.planComparison.amountDelta).toBe(300);

    const monthOnly = byId.get("month-only")!;
    expect(monthOnly.planComparison.hasPlanLink).toBe(false);
    expect(monthOnly.planComparison.amountDelta).toBeNull();
  });

  it("group.changedCount counts only linked rows whose plan comparison reports a change", () => {
    const groups = build([
      // Unchanged linked row — must not count. Name/category/amount/active
      // all match the source plan row.
      makeRow({
        id: "linked-unchanged",
        name: "Rent",
        categoryId: housingCategoryId,
        amountMonthly: 1000,
        sourceExpenseItemId: "src-a",
        sourceName: "Rent",
        sourceCategoryId: housingCategoryId,
        sourceAmountMonthly: 1000,
        sourceIsActive: true,
      }),
      // Changed linked row (amount differs) — counts.
      makeRow({
        id: "linked-changed",
        name: "Insurance",
        categoryId: housingCategoryId,
        amountMonthly: 1200,
        sourceExpenseItemId: "src-b",
        sourceName: "Insurance",
        sourceCategoryId: housingCategoryId,
        sourceAmountMonthly: 900,
        sourceIsActive: true,
      }),
      // Lifecycle-only current-month exclusion still strays from the source
      // plan because the effective current-month amount becomes 0.
      makeRow({
        id: "linked-paused",
        name: "Streaming",
        categoryId: subscriptionCategoryId,
        amountMonthly: 100,
        subscriptionLifecycleStatus: "paused",
        sourceExpenseItemId: "src-c",
        sourceName: "Streaming",
        sourceCategoryId: subscriptionCategoryId,
        sourceAmountMonthly: 100,
        sourceIsActive: true,
      }),
      // Month-only row — never counts. No plan link to diverge from.
      makeRow({
        id: "month-only",
        categoryId: housingCategoryId,
        amountMonthly: 500,
      }),
    ]);
    const fixed = groupByKey(groups, "fixed");
    const subscriptions = groupByKey(groups, "subscription");

    expect(fixed.changedCount).toBe(1);
    expect(subscriptions.changedCount).toBe(1);
  });

  it("'total' matches activeTotal so existing consumers keep their semantics", () => {
    const groups = build([
      makeRow({ id: "a", categoryId: housingCategoryId, amountMonthly: 500 }),
      makeRow({
        id: "b",
        categoryId: housingCategoryId,
        amountMonthly: 200,
        isActive: false,
      }),
    ]);
    const fixed = groupByKey(groups, "fixed");
    expect(fixed.total).toBe(fixed.activeTotal);
    expect(fixed.total).toBe(500);
  });
});
