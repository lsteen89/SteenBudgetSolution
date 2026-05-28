import type { BudgetMonthEditorDto } from "@/types/budget/BudgetMonthsStatusDto";
import type { ExpenseCategoryDto } from "@/types/budget/ExpenseCategoryDto";
import { describe, expect, it } from "vitest";

import { buildExpenseSummary } from "./expenseSummary";

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

function makeRow(overrides: Partial<{
  id: string;
  categoryId: string;
  amountMonthly: number;
  isActive: boolean;
  isDeleted: boolean;
  isMonthOnly: boolean;
  subscriptionLifecycleStatus: "active" | "paused" | "cancelled" | null;
}>) {
  return {
    id: overrides.id ?? "row-" + Math.random().toString(36).slice(2, 8),
    sourceExpenseItemId: null,
    categoryId: overrides.categoryId ?? housingCategoryId,
    name: "Row",
    amountMonthly: overrides.amountMonthly ?? 100,
    subscriptionLifecycleStatus: overrides.subscriptionLifecycleStatus ?? null,
    isActive: overrides.isActive ?? true,
    isDeleted: overrides.isDeleted ?? false,
    isMonthOnly: overrides.isMonthOnly ?? false,
    canUpdateDefault: false,
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

describe("buildExpenseSummary", () => {
  it("returns an empty summary when editor is null", () => {
    const result = buildExpenseSummary({ editor: null, categories });

    expect(result).toEqual({
      fixedTotal: 0,
      variableTotal: 0,
      subscriptionTotal: 0,
      total: 0,
      fixedActiveCount: 0,
      variableActiveCount: 0,
      subscriptionActiveCount: 0,
      totalActiveCount: 0,
    });
  });

  it("groups housing and fixed under fixed total", () => {
    const editor = makeEditor([
      makeRow({ categoryId: housingCategoryId, amountMonthly: 1000 }),
      makeRow({ categoryId: fixedCategoryId, amountMonthly: 250 }),
    ]);

    const result = buildExpenseSummary({ editor, categories });

    expect(result.fixedTotal).toBe(1250);
    expect(result.fixedActiveCount).toBe(2);
    expect(result.variableTotal).toBe(0);
    expect(result.subscriptionTotal).toBe(0);
    expect(result.total).toBe(1250);
  });

  it("groups food (and other non-fixed/sub categories) as variable", () => {
    const editor = makeEditor([
      makeRow({ categoryId: foodCategoryId, amountMonthly: 400 }),
    ]);

    const result = buildExpenseSummary({ editor, categories });

    expect(result.variableTotal).toBe(400);
    expect(result.variableActiveCount).toBe(1);
    expect(result.total).toBe(400);
  });

  it("excludes inactive rows from totals and counts", () => {
    const editor = makeEditor([
      makeRow({ categoryId: housingCategoryId, amountMonthly: 1000 }),
      makeRow({
        categoryId: housingCategoryId,
        amountMonthly: 999,
        isActive: false,
      }),
    ]);

    const result = buildExpenseSummary({ editor, categories });

    expect(result.fixedTotal).toBe(1000);
    expect(result.fixedActiveCount).toBe(1);
  });

  it("excludes deleted rows from totals", () => {
    const editor = makeEditor([
      makeRow({ categoryId: housingCategoryId, amountMonthly: 1000 }),
      makeRow({
        categoryId: housingCategoryId,
        amountMonthly: 999,
        isDeleted: true,
      }),
    ]);

    const result = buildExpenseSummary({ editor, categories });

    expect(result.fixedTotal).toBe(1000);
    expect(result.fixedActiveCount).toBe(1);
  });

  it("counts an active subscription with null lifecycle", () => {
    const editor = makeEditor([
      makeRow({
        categoryId: subscriptionCategoryId,
        amountMonthly: 99,
        subscriptionLifecycleStatus: null,
      }),
    ]);

    const result = buildExpenseSummary({ editor, categories });

    expect(result.subscriptionTotal).toBe(99);
    expect(result.subscriptionActiveCount).toBe(1);
    expect(result.total).toBe(99);
  });

  it("counts an active subscription with lifecycle 'active'", () => {
    const editor = makeEditor([
      makeRow({
        categoryId: subscriptionCategoryId,
        amountMonthly: 99,
        subscriptionLifecycleStatus: "active",
      }),
    ]);

    const result = buildExpenseSummary({ editor, categories });

    expect(result.subscriptionTotal).toBe(99);
  });

  it("excludes paused subscriptions from totals", () => {
    const editor = makeEditor([
      makeRow({
        categoryId: subscriptionCategoryId,
        amountMonthly: 99,
        subscriptionLifecycleStatus: "paused",
      }),
    ]);

    const result = buildExpenseSummary({ editor, categories });

    expect(result.subscriptionTotal).toBe(0);
    expect(result.subscriptionActiveCount).toBe(0);
    expect(result.total).toBe(0);
  });

  it("excludes cancelled subscriptions from totals", () => {
    const editor = makeEditor([
      makeRow({
        categoryId: subscriptionCategoryId,
        amountMonthly: 99,
        subscriptionLifecycleStatus: "cancelled",
      }),
    ]);

    const result = buildExpenseSummary({ editor, categories });

    expect(result.subscriptionTotal).toBe(0);
  });

  it("the total always equals the sum of the three group totals", () => {
    const editor = makeEditor([
      makeRow({ categoryId: housingCategoryId, amountMonthly: 1000 }),
      makeRow({ categoryId: foodCategoryId, amountMonthly: 400 }),
      makeRow({
        categoryId: subscriptionCategoryId,
        amountMonthly: 99,
        subscriptionLifecycleStatus: "active",
      }),
      makeRow({
        categoryId: subscriptionCategoryId,
        amountMonthly: 50,
        subscriptionLifecycleStatus: "paused",
      }),
    ]);

    const result = buildExpenseSummary({ editor, categories });

    expect(result.fixedTotal).toBe(1000);
    expect(result.variableTotal).toBe(400);
    expect(result.subscriptionTotal).toBe(99);
    expect(result.total).toBe(
      result.fixedTotal + result.variableTotal + result.subscriptionTotal,
    );
    expect(result.totalActiveCount).toBe(3);
  });

  it("treats unknown categories as variable (fallback to 'other')", () => {
    const editor = makeEditor([
      makeRow({ categoryId: "unknown-id", amountMonthly: 77 }),
    ]);

    const result = buildExpenseSummary({ editor, categories: [] });

    expect(result.variableTotal).toBe(77);
    expect(result.total).toBe(77);
  });
});
