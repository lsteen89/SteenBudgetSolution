import type { BudgetMonthEditorDto } from "@/types/budget/BudgetMonthsStatusDto";
import type { ExpenseCategoryDto } from "@/types/budget/ExpenseCategoryDto";
import { asCategoryKey } from "@/utils/i18n/budget/categories";

import type { ExpenseLedgerGroupKey } from "../types/expenseEditor.types";

/**
 * Aggregate of the open-month expense rows split into the three ledger groups
 * (fixed / variable / subscription). The aggregate is the single source of
 * truth for both the hero meter and the balance strip headline, so the parts
 * the user sees in the meter always sum to the total they see in the strip.
 *
 * Counting rules mirror the backend dashboard total (see
 * docs/ai/expense-editor-designer-brief.md, "Dashboard totals" section):
 *
 *   - rows must not be deleted
 *   - rows must be active (`isActive === true`)
 *   - subscription rows are excluded when lifecycle is `paused` or `cancelled`
 *
 * Non-subscription rows ignore lifecycle entirely; the backend stores `null`
 * for them.
 */
export type ExpenseSummary = {
  fixedTotal: number;
  variableTotal: number;
  subscriptionTotal: number;
  /** Sum of fixedTotal + variableTotal + subscriptionTotal. */
  total: number;
  /** Active row counts per group, useful for empty-state copy in the hero. */
  fixedActiveCount: number;
  variableActiveCount: number;
  subscriptionActiveCount: number;
  /** Total number of editor rows that contributed to {@link total}. */
  totalActiveCount: number;
};

const EMPTY_SUMMARY: ExpenseSummary = {
  fixedTotal: 0,
  variableTotal: 0,
  subscriptionTotal: 0,
  total: 0,
  fixedActiveCount: 0,
  variableActiveCount: 0,
  subscriptionActiveCount: 0,
  totalActiveCount: 0,
};

function mapCategoryToGroup(categoryKey: string): ExpenseLedgerGroupKey {
  switch (categoryKey) {
    case "housing":
    case "fixed":
      return "fixed";
    case "subscription":
      return "subscription";
    default:
      return "variable";
  }
}

type BuildExpenseSummaryArgs = {
  editor: BudgetMonthEditorDto | null | undefined;
  categories: ExpenseCategoryDto[];
};

export function buildExpenseSummary({
  editor,
  categories,
}: BuildExpenseSummaryArgs): ExpenseSummary {
  if (!editor) return { ...EMPTY_SUMMARY };

  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const summary: ExpenseSummary = { ...EMPTY_SUMMARY };

  for (const row of editor.expenseItems ?? []) {
    if (row.isDeleted) continue;
    if (!row.isActive) continue;

    const category = categoriesById.get(row.categoryId);
    const categoryKey = category ? asCategoryKey(category.code) : "other";
    const group = mapCategoryToGroup(categoryKey);

    // Subscription lifecycle: paused/cancelled rows do not count in the
    // current month total. Non-subscription rows store null for lifecycle.
    if (group === "subscription") {
      const lifecycle = row.subscriptionLifecycleStatus;
      if (lifecycle === "paused" || lifecycle === "cancelled") continue;
    }

    const amount = Number.isFinite(row.amountMonthly) ? row.amountMonthly : 0;

    if (group === "fixed") {
      summary.fixedTotal += amount;
      summary.fixedActiveCount += 1;
    } else if (group === "subscription") {
      summary.subscriptionTotal += amount;
      summary.subscriptionActiveCount += 1;
    } else {
      summary.variableTotal += amount;
      summary.variableActiveCount += 1;
    }
  }

  summary.total =
    summary.fixedTotal + summary.variableTotal + summary.subscriptionTotal;
  summary.totalActiveCount =
    summary.fixedActiveCount +
    summary.variableActiveCount +
    summary.subscriptionActiveCount;

  return summary;
}
