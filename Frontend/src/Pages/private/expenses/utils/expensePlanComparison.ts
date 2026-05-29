import type { SubscriptionLifecycleStatus } from "@/types/budget/BudgetMonthsStatusDto";

/**
 * Inputs needed to compare a materialized month row against its source plan
 * row. The shape is intentionally narrow — only the fields used in the
 * comparison — so callers can build it from either the editor DTO or the
 * derived `ExpenseLedgerRowVm` without coupling the utility to either type.
 *
 * `sourceExpenseItemId` is present so the utility can short-circuit when the
 * row is month-only without forcing callers to do that check separately.
 */
export type ExpensePlanComparisonInput = {
  sourceExpenseItemId: string | null;
  name: string;
  categoryId: string;
  amountMonthly: number;
  isActive: boolean;
  subscriptionLifecycleStatus: SubscriptionLifecycleStatus | null;
  isSubscription: boolean;
  sourceName: string | null;
  sourceCategoryId: string | null;
  sourceAmountMonthly: number | null;
  sourceIsActive: boolean | null;
};

/**
 * Derived comparison between a current-month row and its budget-plan source.
 *
 * `hasPlanLink` is `true` only when the source row actually exists and we
 * have its values. Month-only rows, deleted source rows, and rows where the
 * read model returned partial source data are treated as unlinked so the UI
 * never claims a plan comparison it cannot back up.
 *
 * When `hasPlanLink` is `false`, every other field is `null`/`false`. UI
 * components should not render plan-delta affordances in that case.
 */
export type ExpensePlanComparison = {
  hasPlanLink: boolean;
  /**
   * True when at least one of name/categoryId/amountMonthly/isActive differs
   * between the current month row and the source plan row. Lifecycle is a
   * current-month concept and does not exist on the plan row, so it is folded
   * into the amount comparison through `currentEffectiveAmount` rather than
   * counted as a separate "change".
   */
  changedInMonth: boolean;
  nameChanged: boolean;
  categoryChanged: boolean;
  amountChanged: boolean;
  activeChanged: boolean;
  /**
   * Effective amount the row contributes to the current month total. Mirrors
   * the dashboard rule: deleted/inactive/paused/cancelled rows contribute 0.
   * Always populated (even for month-only rows) so the modal preview can use
   * it without an extra branch.
   */
  currentEffectiveAmount: number;
  /**
   * Effective amount the source plan row contributes to the plan total.
   * `null` when there is no plan link. The plan row has no lifecycle field —
   * lifecycle paused/cancelled is a current-month exclusion only.
   */
  sourceEffectiveAmount: number | null;
  /**
   * `currentEffectiveAmount - sourceEffectiveAmount`, or `null` when there is
   * no plan link. Positive means the current month spends more than the plan
   * expected; negative means it spends less.
   */
  amountDelta: number | null;
};

/**
 * Whether a row's amount counts toward the current month total.
 *
 * Mirrors the dashboard/backend rule used by `buildExpenseLedgerGroups`:
 *   !isDeleted && isActive && (notSubscription || lifecycle in {null, active})
 *
 * Kept here as a pure function so the modal preview (which does not have a
 * `ExpenseLedgerRowVm` yet — it edits a row before save) can use the same
 * rule without depending on the ledger view-model.
 */
function rowCountsInMonthTotal(input: {
  isActive: boolean;
  isSubscription: boolean;
  subscriptionLifecycleStatus: SubscriptionLifecycleStatus | null;
}): boolean {
  if (!input.isActive) return false;
  if (!input.isSubscription) return true;
  return (
    input.subscriptionLifecycleStatus === null ||
    input.subscriptionLifecycleStatus === "active"
  );
}

/**
 * Compute the row-level plan comparison.
 *
 * Returns an "unlinked" comparison (`hasPlanLink: false`) when the row is
 * month-only or when the read model did not return source values for an
 * otherwise-linked row. UI code should treat this as "no plan comparison to
 * show" rather than guessing.
 */
export function buildExpensePlanComparison(
  input: ExpensePlanComparisonInput,
): ExpensePlanComparison {
  const currentEffectiveAmount = rowCountsInMonthTotal(input)
    ? input.amountMonthly
    : 0;

  const hasPlanLink =
    input.sourceExpenseItemId !== null &&
    input.sourceAmountMonthly !== null &&
    input.sourceIsActive !== null &&
    input.sourceCategoryId !== null &&
    input.sourceName !== null;

  if (!hasPlanLink) {
    return {
      hasPlanLink: false,
      changedInMonth: false,
      nameChanged: false,
      categoryChanged: false,
      amountChanged: false,
      activeChanged: false,
      currentEffectiveAmount,
      sourceEffectiveAmount: null,
      amountDelta: null,
    };
  }

  // Source values are non-null in this branch; the bang reads honestly given
  // the `hasPlanLink` guard above.
  const sourceAmount = input.sourceAmountMonthly!;
  const sourceIsActive = input.sourceIsActive!;
  const sourceEffectiveAmount = sourceIsActive ? sourceAmount : 0;

  const nameChanged =
    (input.sourceName ?? "").trim() !== input.name.trim();
  const categoryChanged = input.sourceCategoryId !== input.categoryId;
  const amountChanged = input.amountMonthly !== sourceAmount;
  const activeChanged = input.isActive !== sourceIsActive;
  const effectiveAmountChanged =
    currentEffectiveAmount !== sourceEffectiveAmount;
  const changedInMonth =
    nameChanged ||
    categoryChanged ||
    amountChanged ||
    activeChanged ||
    effectiveAmountChanged;

  return {
    hasPlanLink: true,
    changedInMonth,
    nameChanged,
    categoryChanged,
    amountChanged,
    activeChanged,
    currentEffectiveAmount,
    sourceEffectiveAmount,
    amountDelta: currentEffectiveAmount - sourceEffectiveAmount,
  };
}
