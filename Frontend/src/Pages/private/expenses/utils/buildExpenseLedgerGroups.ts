import type { BudgetMonthEditorDto } from "@/types/budget/BudgetMonthsStatusDto";
import type { ExpenseCategoryDto } from "@/types/budget/ExpenseCategoryDto";
import type { AppLocale } from "@/types/i18n/appLocale";
import { asCategoryKey, labelCategory } from "@/utils/i18n/budget/categories";
import type {
  ExpenseLedgerGroupKey,
  ExpenseLedgerGroupVm,
  ExpenseLedgerRowSourceKind,
  ExpenseLedgerRowState,
  ExpenseLedgerRowVm,
} from "../types/expenseEditor.types";
import { buildExpensePlanComparison } from "./expensePlanComparison";

function mapExpenseCategoryToGroup(categoryKey: string): ExpenseLedgerGroupKey {
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

/**
 * Derive the visible state of a single row.
 *
 * `isActive === false` always wins over lifecycle so the user can manually
 * silence a subscription (or any row) without us second-guessing them via the
 * lifecycle field. Lifecycle is consulted only when the row is otherwise active.
 *
 * Mirrors the dashboard total rule used by {@link buildExpenseSummary}.
 */
function deriveRowState(
  row: {
    isActive: boolean;
    subscriptionLifecycleStatus: ExpenseLedgerRowVm["subscriptionLifecycleStatus"];
  },
  group: ExpenseLedgerGroupKey,
): ExpenseLedgerRowState {
  if (!row.isActive) return "inactive";

  if (group === "subscription") {
    if (row.subscriptionLifecycleStatus === "cancelled") {
      return "subscriptionCancelled";
    }
    if (row.subscriptionLifecycleStatus === "paused") {
      return "subscriptionPaused";
    }
  }

  return "active";
}

function rowOrderRank(row: ExpenseLedgerRowVm): number {
  // Active first, then paused, cancelled, then explicit inactive last.
  switch (row.state) {
    case "active":
      return 0;
    case "subscriptionPaused":
      return 1;
    case "subscriptionCancelled":
      return 2;
    case "inactive":
      return 3;
    default:
      return 4;
  }
}

type BuildExpenseLedgerGroupsArgs = {
  editor: BudgetMonthEditorDto;
  categories: ExpenseCategoryDto[];
  locale: AppLocale;
};

export function buildExpenseLedgerGroups({
  editor,
  categories,
  locale,
}: BuildExpenseLedgerGroupsArgs): ExpenseLedgerGroupVm[] {
  const categoriesById = new Map(categories.map((x) => [x.id, x]));

  const rows: ExpenseLedgerRowVm[] = (editor.expenseItems ?? [])
    .filter((x) => !x.isDeleted)
    .map((x) => {
      const category = categoriesById.get(x.categoryId);
      const categoryKey = category ? asCategoryKey(category.code) : "other";
      const group = mapExpenseCategoryToGroup(categoryKey);
      const isSubscription = group === "subscription";
      const state = deriveRowState(
        {
          isActive: x.isActive,
          subscriptionLifecycleStatus: x.subscriptionLifecycleStatus,
        },
        group,
      );
      const countsInMonthlyTotal = !x.isDeleted && state === "active";
      const sourceKind: ExpenseLedgerRowSourceKind = x.isMonthOnly
        ? "monthOnly"
        : "planLinked";

      // Derive the plan comparison from the same row inputs the rest of the
      // VM uses. Keep this co-located with row construction so the row VM
      // is fully self-describing — consumers should never have to call the
      // utility again with a different shape and risk drift.
      const planComparison = buildExpensePlanComparison({
        sourceExpenseItemId: x.sourceExpenseItemId,
        name: x.name,
        categoryId: x.categoryId,
        amountMonthly: x.amountMonthly,
        isActive: x.isActive,
        subscriptionLifecycleStatus: x.subscriptionLifecycleStatus,
        isSubscription,
        sourceName: x.sourceName,
        sourceCategoryId: x.sourceCategoryId,
        sourceAmountMonthly: x.sourceAmountMonthly,
        sourceIsActive: x.sourceIsActive,
      });

      return {
        id: x.id,
        sourceExpenseItemId: x.sourceExpenseItemId,
        name: x.name,
        categoryId: x.categoryId,
        categoryLabel: labelCategory(categoryKey, locale),
        categoryKey,
        amountMonthly: x.amountMonthly,
        subscriptionLifecycleStatus: x.subscriptionLifecycleStatus,
        isActive: x.isActive,
        isDeleted: x.isDeleted,
        isMonthOnly: x.isMonthOnly,
        canUpdateDefault: x.canUpdateDefault,
        group,
        isSubscription,
        state,
        countsInMonthlyTotal,
        sourceKind,
        sourceName: x.sourceName,
        sourceCategoryId: x.sourceCategoryId,
        sourceAmountMonthly: x.sourceAmountMonthly,
        sourceIsActive: x.sourceIsActive,
        planComparison,
      };
    });

  const groupDefs: Array<{ key: ExpenseLedgerGroupKey; title: string }> = [
    { key: "fixed", title: "Fasta kostnader" },
    { key: "variable", title: "Rörliga kostnader" },
    { key: "subscription", title: "Abonnemang" },
  ];

  return groupDefs.map((groupDef) => {
    const groupRows = rows.filter((row) => row.group === groupDef.key);

    // Stable order: active first, then paused, cancelled, then inactive. Keep
    // the editor's original order within each rank so rows don't shuffle on
    // every render.
    const orderedRows = [...groupRows].sort((a, b) => {
      const rankDiff = rowOrderRank(a) - rowOrderRank(b);
      if (rankDiff !== 0) return rankDiff;
      return groupRows.indexOf(a) - groupRows.indexOf(b);
    });

    // Derive active/inactive arrays from the *ordered* list so the UI, which
    // renders these arrays directly, gets the same paused→cancelled→inactive
    // sequence the test contract describes for `rows`.
    const activeRows = orderedRows.filter((row) => row.countsInMonthlyTotal);
    const inactiveRows = orderedRows.filter(
      (row) => !row.countsInMonthlyTotal,
    );

    const sumAmounts = (rs: ExpenseLedgerRowVm[]) =>
      rs.reduce(
        (sum, row) =>
          sum + (Number.isFinite(row.amountMonthly) ? row.amountMonthly : 0),
        0,
      );
    const activeTotal = sumAmounts(activeRows);
    const inactiveTotal = sumAmounts(inactiveRows);

    const largestActiveRow = activeRows.reduce<ExpenseLedgerRowVm | null>(
      (current, row) => {
        if (!current) return row;
        return row.amountMonthly > current.amountMonthly ? row : current;
      },
      null,
    );

    // Split the inactive bucket by state so the section header can render
    // honest counts (a cancelled subscription should not be labelled
    // "paused"). `manuallyInactiveCount` covers the `isActive === false` case
    // in any group, including subscriptions where the user explicitly toggled
    // the row off rather than using a lifecycle action.
    let pausedCount = 0;
    let cancelledCount = 0;
    let manuallyInactiveCount = 0;
    for (const row of inactiveRows) {
      if (row.state === "subscriptionPaused") pausedCount += 1;
      else if (row.state === "subscriptionCancelled") cancelledCount += 1;
      else manuallyInactiveCount += 1; // state === "inactive"
    }

    return {
      key: groupDef.key,
      title: groupDef.title,
      rows: orderedRows,
      total: activeTotal,
      activeRows,
      inactiveRows,
      activeTotal,
      inactiveTotal,
      activeCount: activeRows.length,
      inactiveCount: inactiveRows.length,
      pausedCount,
      cancelledCount,
      manuallyInactiveCount,
      monthOnlyCount: groupRows.filter((row) => row.sourceKind === "monthOnly")
        .length,
      changedCount: groupRows.filter(
        (row) =>
          row.planComparison.hasPlanLink &&
          row.planComparison.changedInMonth,
      ).length,
      largestActiveRow,
    };
  });
}
