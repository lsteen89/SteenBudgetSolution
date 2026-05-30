import type { BudgetMonthIncomeItemKind } from "@/types/budget/BudgetMonthsStatusDto";

/**
 * Ledger group key. Mirrors `BudgetMonthIncomeItemKind` 1:1 — income has three
 * fixed kinds and three matching groups, so there is no mapping layer between
 * the wire kind and the visible group. Keeping them identical avoids the
 * "expense categories vs expense groups" indirection that exists on the
 * expense side, where multiple categories collapse into one group.
 */
export type IncomeLedgerGroupKey = BudgetMonthIncomeItemKind;

/**
 * Display state of a single income row.
 *
 * Income has no subscription-style lifecycle — the only honest states are
 * `active` (counts in the current-month total) and `inactive` (the user
 * toggled the row off for this month, so it does not count). Salary is
 * always active by backend invariant; this enum still admits `inactive` for
 * the salary kind so a stale/unexpected backend payload cannot crash the VM.
 */
export type IncomeLedgerRowState = "active" | "inactive";

/**
 * Where the row originates from.
 *
 * - `monthOnly`  — created or materialized as a month-only row. The wire row
 *                  has `sourceIncomeItemId === null`, so plan-writing scopes
 *                  are not available.
 * - `planLinked` — materialized from a baseline budget-plan row and can
 *                  optionally update the plan via the editor scopes.
 */
export type IncomeLedgerRowSourceKind = "monthOnly" | "planLinked";

export type IncomeLedgerRowVm = {
  id: string;
  sourceIncomeItemId: string | null;
  kind: BudgetMonthIncomeItemKind;
  name: string;
  amountMonthly: number;
  isActive: boolean;
  isDeleted: boolean;
  isMonthOnly: boolean;
  canUpdateDefault: boolean;
  group: IncomeLedgerGroupKey;
  /** Derived display state. See {@link IncomeLedgerRowState}. */
  state: IncomeLedgerRowState;
  /**
   * True when the row's amount contributes to the current-month total.
   * Mirrors the backend dashboard rule for income:
   *   !isDeleted && isActive
   *
   * Held on the VM so the section/row components can read it without
   * re-deriving the rule (and risking drift).
   */
  countsInMonthlyTotal: boolean;
  /** Whether the row exists only in the current month or is linked to a plan row. */
  sourceKind: IncomeLedgerRowSourceKind;
};

export type IncomeLedgerGroupVm = {
  key: IncomeLedgerGroupKey;
  /** All rows in the group, ordered active-first then inactive. */
  rows: IncomeLedgerRowVm[];
  /** Rows that count in the current-month total. */
  activeRows: IncomeLedgerRowVm[];
  /** Rows that do not count (user toggled them off for this month). */
  inactiveRows: IncomeLedgerRowVm[];
  /** Sum of {@link activeRows} amounts. Inactive rows are not included. */
  activeTotal: number;
  /** Sum of {@link inactiveRows} amounts, for explanatory copy. */
  inactiveTotal: number;
  activeCount: number;
  inactiveCount: number;
  /** Count of rows in the group whose source kind is `monthOnly`. */
  monthOnlyCount: number;
  /**
   * Whether the user can add a row directly to this group from the section
   * header. Salary is a single-row group by backend invariant — adding a
   * second salary row is meaningless — so its group renders no add button.
   */
  canCreateInGroup: boolean;
};
