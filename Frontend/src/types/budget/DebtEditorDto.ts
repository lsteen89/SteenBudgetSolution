// Typed FE bindings for the Debt PR 5 editor read model. Mirrors the C# DTOs
// in `Backend/Application/DTO/Budget/Months/Editor/Debt/*` — keep these in
// sync if the backend record adds, renames, or drops a field.
//
// The endpoint is `GET /api/budgets/months/{yearMonth}/debt-editor`. The
// legacy `GET /debt-items` shape (`BudgetMonthDebtEditorRowDto` in
// `BudgetMonthsStatusDto.ts`) is intentionally retained for the existing
// planned-payment mutation response; PR 6 reads from this richer endpoint
// only.

export type DebtEditorGroup = "active" | "skipped" | "paid" | "archived";

/**
 * Stable disabled-reason codes from `BudgetMonthDebtEditorDisabledReasons`
 * (Backend). The FE matches each code to localised copy; the resolver does
 * not bind codes to specific actions — multiple codes can apply to one row.
 */
export type DebtEditorDisabledReason =
  | "monthClosed"
  | "monthSkipped"
  | "rowRemoved"
  | "rowDeleted"
  | "rowClosed"
  | "monthOnlyNoPlan"
  | "sourceMissing"
  | "sourcePaidOff"
  | "sourceArchived"
  | "sourceDeleted"
  | "alreadyIncluded"
  | "alreadyNotIncluded"
  | "sourceLinkedHistoryExists";

export type DebtRowActionsDto = {
  canEditPayment: boolean;
  canEditDetails: boolean;
  canUpdateBalance: boolean;
  canSkipThisMonth: boolean;
  canIncludeThisMonth: boolean;
  canMarkPaidOff: boolean;
  canArchive: boolean;
  canRestore: boolean;
  canRemove: boolean;
  canUpdatePlan: boolean;
};

/**
 * Progress is derived strictly from typed `DebtBalanceEvent` history. The
 * row carries `progress: null` when no events exist — the FE treats that as
 * "no history; hide the bar entirely". Never synthesise from current vs
 * original balance — the planning brief is explicit that progress only
 * appears for real recorded events.
 */
export type DebtRowProgressDto = {
  currentBalance: number;
  firstBalance: number;
  totalPaidDelta: number;
  /** null when `firstBalance === 0` so the FE never divides by zero. */
  percentPaid: number | null;
  eventCount: number;
  /** ISO 8601 datetime string. */
  firstEventAt: string;
  /** ISO 8601 datetime string. */
  lastEventAt: string;
};

/**
 * Backend-owned split of the planned monthly payment into interest, fee,
 * and principal — plus a projected post-month balance and an advisory flag
 * for shortfall. Debt Polish PR 1 keeps this math on the backend; the FE
 * renders these values directly and never re-derives them from balance/APR.
 *
 * Rules to preserve at render time:
 *   * `plannedMonthlyPayment` is what the dashboard equation already uses
 *     (`included` rows feed `includedMonthlyPaymentTotal`). Do NOT relabel
 *     `principalPayment` as the cash outflow.
 *   * `currentBalance` (on the row) stays the source of truth for
 *     "Kvar att betala". `projectedBalanceAfterMonth` is a forward view.
 *   * `coversInterestAndFees === false` is an amber advisory: the planned
 *     payment is not enough to make the balance shrink this month.
 */
export type DebtMonthlyPaymentBreakdownDto = {
  plannedMonthlyPayment: number;
  monthlyInterest: number;
  monthlyFee: number;
  principalPayment: number;
  projectedBalanceAfterMonth: number;
  coversInterestAndFees: boolean;
  interestAndFeeShortfall: number;
};

export type DebtEditorRowDto = {
  id: string;
  sourceDebtId: string | null;
  name: string;
  type: string;
  // Field-pair convention: bare = month-row value (what the user sees in
  // this month); `source*` = the linked `Debt` plan-row value, or null for
  // month-only rows.
  balance: number;
  sourceBalance: number | null;
  apr: number;
  sourceApr: number | null;
  monthlyFee: number | null;
  sourceMonthlyFee: number | null;
  minPayment: number | null;
  sourceMinPayment: number | null;
  termMonths: number | null;
  sourceTermMonths: number | null;
  monthlyPayment: number;
  sourceMonthlyPayment: number | null;
  sourceLifecycleStatus: string | null;
  participationStatus: string;
  isMonthOnly: boolean;
  isRemoved: boolean;
  sortOrder: number;
  /** Precomputed ledger group — never re-derive on the client. */
  group: DebtEditorGroup;
  progress: DebtRowProgressDto | null;
  /** Debt Polish PR 1: backend-owned monthly breakdown. Always present. */
  paymentBreakdown: DebtMonthlyPaymentBreakdownDto;
  actions: DebtRowActionsDto;
  disabledReasons: DebtEditorDisabledReason[];
};

export type DebtEditorSummaryDto = {
  includedMonthlyPaymentTotal: number;
  notIncludedMonthlyPaymentTotal: number;
  activeLiabilityBalanceTotal: number;
  paidOffBalanceTotal: number;
  archivedBalanceTotal: number;
  /**
   * Debt Polish PR 1: derived totals across `included` rows only. Never
   * substitute these for `includedMonthlyPaymentTotal` in the dashboard
   * equation — they are explanatory.
   */
  includedMonthlyInterestTotal: number;
  includedMonthlyFeeTotal: number;
  includedPrincipalPaymentTotal: number;
  /**
   * Sum of (included rows' projectedBalanceAfterMonth) + (skipped rows'
   * current balance, since no payment is applied this month).
   */
  projectedActiveLiabilityBalanceAfterMonth: number;
  includedCount: number;
  notIncludedCount: number;
  paidOffCount: number;
  archivedCount: number;
  /** Count of `included` rows whose payment does not cover interest + fee. */
  rowsBelowInterestAndFeesCount: number;
};

export type DebtEditorHistoryEventDto = {
  id: string;
  entityId: string;
  sourceEntityId: string | null;
  entityType: string;
  changeType: string;
  /** Lifecycle / participation action from `ChangeSetJson.action`, when present. */
  action: string | null;
  /** ISO 8601 datetime string. */
  changedAt: string;
};

/**
 * Full Debt editor payload — one fetch returns everything PR 6's shell
 * needs to render hero, balance strip, ledger groups, and the recent-events
 * timeline without re-deriving financial state on the client.
 *
 * `isReadOnly` is derived purely from `monthStatus` — closed/skipped months
 * expose no mutation affordances regardless of row state.
 */
export type BudgetMonthDebtEditorDto = {
  yearMonth: string;
  monthStatus: string;
  isReadOnly: boolean;
  summary: DebtEditorSummaryDto;
  rows: DebtEditorRowDto[];
  recentEvents: DebtEditorHistoryEventDto[];
};
