import type { SubscriptionLifecycleStatus } from "@/types/budget/BudgetMonthsStatusDto";

export type ExpenseLedgerGroupKey = "fixed" | "variable" | "subscription";

/**
 * Display state of a single ledger row.
 *
 * - `active`               — row counts in the current-month total.
 * - `inactive`             — user toggled the row off for the month. Applies to
 *                            non-subscription rows, and to subscription rows
 *                            that were explicitly deactivated.
 * - `subscriptionPaused`   — subscription with lifecycle `paused`.
 * - `subscriptionCancelled`— subscription with lifecycle `cancelled`.
 */
export type ExpenseLedgerRowState =
  | "active"
  | "inactive"
  | "subscriptionPaused"
  | "subscriptionCancelled";

/**
 * Where the row originates from.
 *
 * - `monthOnly`  — created or materialized as a month-only row. Cannot write
 *                  back to the budget plan (no `SourceExpenseItemId`).
 * - `planLinked` — materialized from a baseline budget-plan row and can
 *                  optionally update the plan.
 */
export type ExpenseLedgerRowSourceKind = "monthOnly" | "planLinked";

export type ExpenseLedgerRowVm = {
  id: string;
  sourceExpenseItemId: string | null;
  name: string;
  categoryId: string;
  categoryLabel: string;
  categoryKey: string;
  amountMonthly: number;
  subscriptionLifecycleStatus: SubscriptionLifecycleStatus | null;
  isActive: boolean;
  isDeleted: boolean;
  isMonthOnly: boolean;
  canUpdateDefault: boolean;
  group: ExpenseLedgerGroupKey;
  /** True when the row belongs to the subscription group. */
  isSubscription: boolean;
  /** Derived display state. See {@link ExpenseLedgerRowState}. */
  state: ExpenseLedgerRowState;
  /**
   * True when the row's amount contributes to the current month total.
   * Mirrors the backend dashboard rule:
   *   !isDeleted && isActive && (notSubscription || lifecycle in {null, active})
   */
  countsInMonthlyTotal: boolean;
  /** Whether the row exists only in the current month or is linked to a plan row. */
  sourceKind: ExpenseLedgerRowSourceKind;
};

export type ExpenseLedgerGroupVm = {
  key: ExpenseLedgerGroupKey;
  title: string;
  /** All rows in the group, sorted active-first then inactive/paused/cancelled. */
  rows: ExpenseLedgerRowVm[];
  /** Sum of {@link activeRows} amounts. Same value as `activeTotal`. */
  total: number;
  /** Rows that count in the current month total. */
  activeRows: ExpenseLedgerRowVm[];
  /** Rows that do not count: inactive, paused, or cancelled. */
  inactiveRows: ExpenseLedgerRowVm[];
  activeTotal: number;
  /** Sum of inactive/paused/cancelled row amounts, useful for explanatory copy. */
  inactiveTotal: number;
  activeCount: number;
  /** Total of rows that do not count: pausedCount + cancelledCount + inactiveCount. */
  inactiveCount: number;
  /** Subscription rows with lifecycle `paused`. Always 0 for non-subscription groups. */
  pausedCount: number;
  /** Subscription rows with lifecycle `cancelled`. Always 0 for non-subscription groups. */
  cancelledCount: number;
  /** Rows the user explicitly toggled off (`isActive === false`), regardless of group. */
  manuallyInactiveCount: number;
  /** Count of rows in the group whose source kind is `monthOnly`. */
  monthOnlyCount: number;
  /** Largest active row by amount, or null when there are no active rows. */
  largestActiveRow: ExpenseLedgerRowVm | null;
};
