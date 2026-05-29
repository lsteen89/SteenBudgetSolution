import type { BudgetMonthEditorDto } from "@/types/budget/BudgetMonthsStatusDto";
import type { ExpenseCategoryDto } from "@/types/budget/ExpenseCategoryDto";
import { describe, expect, it } from "vitest";

import { buildExpenseLedgerGroups } from "./buildExpenseLedgerGroups";
import { buildExpenseSummary } from "./expenseSummary";

/**
 * End-to-end "math proof" for the expenses editor display logic.
 *
 * One fixture drives the same three utilities the page uses — the hero meter
 * + balance strip (`buildExpenseSummary`), the grouped ledger
 * (`buildExpenseLedgerGroups`), and the per-row plan delta
 * (`buildExpensePlanComparison`, exercised through the group view-model) — so
 * the numbers the user reads on every surface are proven to reconcile from a
 * single source of truth.
 *
 * The fixture is tuned to the review's reference figures:
 *   fixed 22 730 + variable 7 400 + subscriptions 398 = 30 528
 *   income 54 000 + carry-over 0 − 30 528 = 23 472
 */

const housingCategoryId = "11111111-1111-4111-8111-111111111111";
const fixedCategoryId = "11111111-1111-4111-8111-111111111112";
const foodCategoryId = "22222222-2222-4222-8222-222222222222";
const transportCategoryId = "22222222-2222-4222-8222-222222222223";
const clothingCategoryId = "22222222-2222-4222-8222-222222222224";
const subscriptionCategoryId = "33333333-3333-4333-8333-333333333333";

const categories: ExpenseCategoryDto[] = [
  { id: housingCategoryId, name: "Boende", code: "housing" },
  { id: fixedCategoryId, name: "Räkningar & nödvändigt", code: "fixed" },
  { id: foodCategoryId, name: "Mat", code: "food" },
  { id: transportCategoryId, name: "Transport", code: "transport" },
  { id: clothingCategoryId, name: "Kläder", code: "clothing" },
  { id: subscriptionCategoryId, name: "Prenumerationer", code: "subscription" },
];

type RowOverrides = Partial<{
  id: string;
  sourceExpenseItemId: string | null;
  categoryId: string;
  name: string;
  amountMonthly: number;
  subscriptionLifecycleStatus: "active" | "paused" | "cancelled" | null;
  isActive: boolean;
  isDeleted: boolean;
  isMonthOnly: boolean;
  canUpdateDefault: boolean;
  sourceName: string | null;
  sourceCategoryId: string | null;
  sourceAmountMonthly: number | null;
  sourceIsActive: boolean | null;
}>;

function makeRow(overrides: RowOverrides) {
  const isMonthOnly = overrides.isMonthOnly ?? false;
  return {
    id: overrides.id ?? "row-" + Math.random().toString(36).slice(2, 8),
    sourceExpenseItemId:
      overrides.sourceExpenseItemId ?? (isMonthOnly ? null : "src-" + (overrides.id ?? "x")),
    categoryId: overrides.categoryId ?? housingCategoryId,
    name: overrides.name ?? "Row",
    amountMonthly: overrides.amountMonthly ?? 0,
    subscriptionLifecycleStatus: overrides.subscriptionLifecycleStatus ?? null,
    isActive: overrides.isActive ?? true,
    isDeleted: overrides.isDeleted ?? false,
    isMonthOnly,
    canUpdateDefault: overrides.canUpdateDefault ?? !isMonthOnly,
    sourceName: overrides.sourceName ?? null,
    sourceCategoryId: overrides.sourceCategoryId ?? null,
    sourceAmountMonthly: overrides.sourceAmountMonthly ?? null,
    sourceIsActive: overrides.sourceIsActive ?? null,
  };
}

function makeEditor(expenseItems: ReturnType<typeof makeRow>[]): BudgetMonthEditorDto {
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

// Reference month fixture.
const INCOME = 54_000;
const CARRY_OVER = 0;

const editor = makeEditor([
  // --- Fixed group: 15 000 + 3 000 + 4 730 = 22 730 ---
  makeRow({
    id: "hyra",
    categoryId: housingCategoryId,
    name: "Hyra",
    amountMonthly: 15_000,
    sourceName: "Hyra",
    sourceCategoryId: housingCategoryId,
    sourceAmountMonthly: 15_000,
    sourceIsActive: true,
  }),
  // Plan-linked + changed this month: current 3 000 vs plan 2 500 => +500.
  makeRow({
    id: "el-och-varme",
    categoryId: fixedCategoryId,
    name: "El och värme",
    amountMonthly: 3_000,
    sourceName: "El och värme",
    sourceCategoryId: fixedCategoryId,
    sourceAmountMonthly: 2_500,
    sourceIsActive: true,
  }),
  makeRow({
    id: "forsakring",
    categoryId: fixedCategoryId,
    name: "Försäkring",
    amountMonthly: 4_730,
    isMonthOnly: true,
  }),
  // Inactive fixed row — must NOT count in the fixed total.
  makeRow({
    id: "gammalt-abonnemang",
    categoryId: fixedCategoryId,
    name: "Avslutat",
    amountMonthly: 999,
    isActive: false,
  }),

  // --- Variable group: 4 000 + 2 400 + 1 000 = 7 400 ---
  makeRow({
    id: "mat",
    categoryId: foodCategoryId,
    name: "Mat",
    amountMonthly: 4_000,
    isMonthOnly: true,
  }),
  makeRow({
    id: "manadskort",
    categoryId: transportCategoryId,
    name: "Månadskort",
    amountMonthly: 2_400,
    isMonthOnly: true,
  }),
  makeRow({
    id: "klader",
    categoryId: clothingCategoryId,
    name: "Kläder",
    amountMonthly: 1_000,
    isMonthOnly: true,
  }),

  // --- Subscriptions: 199 + 199 = 398 active; one paused (150) excluded ---
  makeRow({
    id: "streaming",
    categoryId: subscriptionCategoryId,
    name: "Streaming",
    amountMonthly: 199,
    subscriptionLifecycleStatus: "active",
    isMonthOnly: true,
  }),
  makeRow({
    id: "musik",
    categoryId: subscriptionCategoryId,
    name: "Musik",
    amountMonthly: 199,
    subscriptionLifecycleStatus: null,
    isMonthOnly: true,
  }),
  makeRow({
    id: "nyheter",
    categoryId: subscriptionCategoryId,
    name: "Nyheter",
    amountMonthly: 150,
    subscriptionLifecycleStatus: "paused",
    isMonthOnly: true,
  }),
]);

const summary = buildExpenseSummary({ editor, categories });
const groups = buildExpenseLedgerGroups({ editor, categories, locale: "sv-SE" });
const groupByKey = (key: "fixed" | "variable" | "subscription") =>
  groups.find((g) => g.key === key)!;

describe("expenses editor — math proof", () => {
  // A. Expense total = fixed + variable + subscriptions
  it("A. expense total = fixed + variable + subscriptions (22 730 + 7 400 + 398 = 30 528)", () => {
    expect(summary.fixedTotal).toBe(22_730);
    expect(summary.variableTotal).toBe(7_400);
    expect(summary.subscriptionTotal).toBe(398);
    expect(summary.fixedTotal + summary.variableTotal + summary.subscriptionTotal).toBe(
      30_528,
    );
    expect(summary.total).toBe(30_528);
  });

  // B. Remaining after expenses = income + carry-over − total expenses
  it("B. remaining after expenses (54 000 + 0 − 30 528 = 23 472)", () => {
    const remaining = INCOME + CARRY_OVER - summary.total;
    expect(remaining).toBe(23_472);
  });

  // C. Each group total = sum of the rows counted in that group
  it("C. group totals equal the sum of their counted rows", () => {
    const fixed = groupByKey("fixed");
    const variable = groupByKey("variable");
    const subscription = groupByKey("subscription");

    const sumActive = (g: typeof fixed) =>
      g.activeRows.reduce((s, r) => s + r.amountMonthly, 0);

    expect(fixed.activeTotal).toBe(22_730);
    expect(sumActive(fixed)).toBe(22_730);

    expect(variable.activeTotal).toBe(7_400);
    expect(sumActive(variable)).toBe(7_400);

    expect(subscription.activeTotal).toBe(398);
    expect(sumActive(subscription)).toBe(398);

    // Group totals reconcile to the summary group totals (same source).
    expect(fixed.activeTotal).toBe(summary.fixedTotal);
    expect(variable.activeTotal).toBe(summary.variableTotal);
    expect(subscription.activeTotal).toBe(summary.subscriptionTotal);
  });

  // D. Paused/inactive rows are excluded from monthly totals
  it("D. paused subscriptions and inactive rows are excluded from totals", () => {
    const subscription = groupByKey("subscription");
    const fixed = groupByKey("fixed");

    // Paused "Nyheter" (150) is present but not counted.
    const paused = subscription.inactiveRows.find((r) => r.name === "Nyheter");
    expect(paused?.state).toBe("subscriptionPaused");
    expect(paused?.countsInMonthlyTotal).toBe(false);
    expect(subscription.activeRows.some((r) => r.name === "Nyheter")).toBe(false);

    // Inactive "Avslutat" (999) is present but not counted in the fixed total.
    const inactive = fixed.inactiveRows.find((r) => r.name === "Avslutat");
    expect(inactive?.countsInMonthlyTotal).toBe(false);
    expect(fixed.activeTotal).toBe(22_730); // 999 not included

    // The summary's grand total likewise excludes both.
    expect(summary.total).toBe(30_528);
  });

  // E. "Ändrad mot planen" delta = current month amount − plan amount
  it("E. changed-row delta equals current − plan (3 000 − 2 500 = +500)", () => {
    const fixed = groupByKey("fixed");
    const changed = fixed.activeRows.find((r) => r.name === "El och värme")!;

    expect(changed.planComparison.hasPlanLink).toBe(true);
    expect(changed.planComparison.changedInMonth).toBe(true);
    expect(changed.amountMonthly).toBe(3_000);
    expect(changed.sourceAmountMonthly).toBe(2_500);
    expect(changed.planComparison.amountDelta).toBe(500);

    // A plan-linked, unchanged row reports no delta.
    const unchanged = fixed.activeRows.find((r) => r.name === "Hyra")!;
    expect(unchanged.planComparison.hasPlanLink).toBe(true);
    expect(unchanged.planComparison.changedInMonth).toBe(false);
    expect(unchanged.planComparison.amountDelta).toBe(0);
  });

  // F. Bar segments use the same source values as the hero split / group totals
  it("F. bar segments come from the same summary as the hero split", () => {
    // The balance strip meter divides each group total by summary.total and
    // the hero split prints the same group totals. Prove they share one source
    // and that the parts sum to the whole.
    const segments = [
      summary.fixedTotal,
      summary.variableTotal,
      summary.subscriptionTotal,
    ];
    expect(segments.reduce((s, v) => s + v, 0)).toBe(summary.total);

    const denominator = Math.max(summary.total, 1);
    const fractions = segments.map((v) => v / denominator);
    // Fractions sum to 1 (within float tolerance) and match the group totals.
    expect(fractions.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 10);
    expect(summary.fixedTotal / denominator).toBeCloseTo(22_730 / 30_528, 10);
    expect(summary.variableTotal / denominator).toBeCloseTo(7_400 / 30_528, 10);
    expect(summary.subscriptionTotal / denominator).toBeCloseTo(398 / 30_528, 10);
  });
});
