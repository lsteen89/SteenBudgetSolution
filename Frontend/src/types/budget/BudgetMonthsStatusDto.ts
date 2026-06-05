export type BudgetMonthStatus = "open" | "closed" | "skipped";
export type CarryOverMode = "none" | "full" | "custom";
export type SubscriptionLifecycleStatus = "active" | "paused" | "cancelled";

export type BudgetMonthListItemDto = {
  yearMonth: string;
  status: BudgetMonthStatus;
  openedAt: string;
  closedAt: string | null;
};

export type BudgetMonthsStatusDto = {
  openMonthYearMonth: string | null;
  currentYearMonth: string;
  gapMonthsCount: number;
  months: BudgetMonthListItemDto[];
  suggestedAction: "createFirstMonth" | "promptStartCurrent" | "none" | string;
};

export type BudgetMonthEditorMetaDto = {
  budgetMonthId: string;
  yearMonth: string;
  status: BudgetMonthStatus | string;
  isEditable: boolean;
  carryOverAmount: number | null;
  carryOverMode: string;
};

export type BudgetMonthExpenseItemEditorRowDto = {
  id: string;
  sourceExpenseItemId: string | null;
  categoryId: string;
  name: string;
  amountMonthly: number;
  subscriptionLifecycleStatus: SubscriptionLifecycleStatus | null;
  isActive: boolean;
  isDeleted: boolean;
  isMonthOnly: boolean;
  canUpdateDefault: boolean;
  // Source-plan values for the linked ExpenseItem row, if any. Null for
  // month-only rows and for mutation responses (the patch/create endpoints do
  // not re-read the plan row — refetch the editor query to refresh these
  // fields). Used to compute plan-vs-current-month deltas honestly.
  sourceCategoryId: string | null;
  sourceName: string | null;
  sourceAmountMonthly: number | null;
  sourceIsActive: boolean | null;
};

export type BudgetMonthEditorDto = {
  month: BudgetMonthEditorMetaDto;
  expenseItems: BudgetMonthExpenseItemEditorRowDto[];
};

export type ExpenseEditScope =
  | "currentMonthOnly"
  | "currentMonthAndBudgetPlan"
  | "budgetPlanOnly";

export type IncomeEditScope = ExpenseEditScope;

export type BudgetMonthIncomeItemKind =
  | "salary"
  | "sideHustle"
  | "householdMember";

export type BudgetMonthIncomeItemEditorRowDto = {
  id: string;
  sourceIncomeItemId: string | null;
  kind: BudgetMonthIncomeItemKind;
  name: string;
  amountMonthly: number;
  isActive: boolean;
  isDeleted: boolean;
  isMonthOnly: boolean;
  canUpdateDefault: boolean;
  // Source-plan comparison fields. Null when the month row is month-only,
  // when the salary plan row has no name column, or when the editor read
  // could not resolve the linked plan row. Consumed by PR 6 to render the
  // "Ändrad i {månad}" exception pill.
  sourceName: string | null;
  sourceAmountMonthly: number | null;
  sourceIsActive: boolean | null;
};

export type PatchBudgetMonthExpenseItemRequestDto = {
  name: string;
  categoryId: string;
  amountMonthly: number;
  isActive: boolean;
  subscriptionLifecycleStatus?: SubscriptionLifecycleStatus | null;
  updateDefault: boolean;
  scope?: ExpenseEditScope;
};

export type CreateBudgetMonthExpenseItemRequestDto = {
  categoryId: string;
  name: string;
  amountMonthly: number;
  isActive: boolean;
  // Optional & nullable so non-subscription rows can omit it. Backend rule:
  // must be null for non-subscription rows; subscription rows default to
  // "active" server-side when null.
  subscriptionLifecycleStatus?: SubscriptionLifecycleStatus | null;
};

export type PatchBudgetMonthExpenseItemBulkRowDto = {
  monthExpenseItemId: string;
  name?: string | null;
  categoryId?: string | null;
  amountMonthly?: number | null;
  isActive?: boolean | null;
  subscriptionLifecycleStatus?: SubscriptionLifecycleStatus | null;
  updateDefault: boolean;
  scope?: ExpenseEditScope | null;
};

export type PatchBudgetMonthExpenseItemsBulkRequestDto = {
  items: PatchBudgetMonthExpenseItemBulkRowDto[];
};

export type PatchBudgetMonthIncomeItemRequestDto = {
  name?: string | null;
  amountMonthly: number;
  isActive?: boolean | null;
  updateDefault: boolean;
  scope?: IncomeEditScope | null;
};

// Create exposes only two scopes — `budgetPlanOnly` is a future-plan-only
// add flow the income editor deliberately does not surface. Narrower than
// `IncomeEditScope` so the typed path can't ever send the third value to
// the create endpoint (which the backend validator rejects anyway).
export type IncomeCreateScope = Exclude<IncomeEditScope, "budgetPlanOnly">;

export type CreateBudgetMonthIncomeItemRequestDto = {
  kind: Exclude<BudgetMonthIncomeItemKind, "salary">;
  name: string;
  amountMonthly: number;
  isActive: boolean;
  // Optional on the wire so older callers keep their existing month-only
  // behavior. The backend resolves null/omitted to `currentMonthOnly`.
  scope?: IncomeCreateScope | null;
};

export type PatchBudgetMonthIncomeItemBulkRowDto = {
  monthIncomeItemId: string;
  name?: string | null;
  amountMonthly?: number | null;
  isActive?: boolean | null;
  updateDefault: boolean;
  scope?: IncomeEditScope | null;
};

export type PatchBudgetMonthIncomeItemsBulkRequestDto = {
  items: PatchBudgetMonthIncomeItemBulkRowDto[];
};

export type SavingsGoalEditScope = ExpenseEditScope;

export type BudgetMonthSavingsGoalEditorRowDto = {
  id: string;
  sourceSavingsGoalId: string | null;
  name: string;
  targetAmount: number | null;
  targetDate: string | null;
  amountSaved: number | null;
  monthlyContribution: number;
  status: string;
  closedReason?: string | null;
  closedAt?: string | null;
  isDeleted: boolean;
  isMonthOnly: boolean;
  canUpdateDefault: boolean;
};

export type PatchBudgetMonthSavingsGoalRequestDto = {
  monthlyContribution: number;
  /** ISO yyyy-MM-dd. Omit/null means "leave the goal target date unchanged". */
  targetDate?: string | null;
  scope?: SavingsGoalEditScope | null;
};

export type PatchBudgetMonthSavingsGoalBulkRowDto = {
  monthSavingsGoalId: string;
  monthlyContribution: number;
  scope?: SavingsGoalEditScope | null;
};

export type PatchBudgetMonthSavingsGoalsBulkRequestDto = {
  items: PatchBudgetMonthSavingsGoalBulkRowDto[];
};

/**
 * Direction of a one-time goal transfer. V2 keeps the wire format
 * positive and lets the direction carry the sign — mirrors the backend
 * `SavingsGoalTransferDirections` constants (lowercase ASCII).
 */
export type SavingsGoalTransferDirection = "deposit" | "withdraw";

/**
 * V2 PR-07 — body for
 * `POST /api/budgets/months/{ym}/savings-goals/{id}/transfer`.
 *
 * `amount` is always positive; `direction` carries the sign. `note` is
 * optional, ≤ 200 chars; the modal feeds the chosen counter-account into
 * it as a structured prefix so the audit row tells the whole story
 * without joining back to anything else.
 */
export type TransferBudgetMonthSavingsGoalRequestDto = {
  amount: number;
  direction: SavingsGoalTransferDirection;
  note?: string | null;
};

/**
 * V2 PR-05 — body for
 * `PATCH /api/budgets/months/{ym}/savings-goals/{id}/name`.
 *
 * Name is plan-level: the BE writes both the snapshot row and the
 * baseline `SavingsGoal.Name` in one transaction when a baseline
 * exists. No scope strip — there is no meaningful "snapshot vs plan"
 * semantics for a name. The handler trims; the FE trims defensively
 * before submit so the dirty-check matches the BE no-op short-circuit.
 */
export type RenameBudgetMonthSavingsGoalRequestDto = {
  name: string;
};

/**
 * V2 PR-06 — body for
 * `PATCH /api/budgets/months/{ym}/savings-goals/{id}/target-amount`.
 *
 * Same shape rules as the rename body: plan-level field, no scope
 * strip, both rows written in one transaction. The BE rejects writes
 * that would land below the goal's current `amountSaved` with
 * `BudgetMonthSavingsGoal.TargetBelowSaved`; the FE also enforces
 * this inline so the user is told before the round-trip.
 */
export type ChangeBudgetMonthSavingsGoalTargetAmountRequestDto = {
  targetAmount: number;
};

export type CreateBudgetMonthSavingsGoalRequestDto = {
  name: string;
  targetAmount: number;
  targetDate: string;
  amountSaved: number | null;
  monthlyContribution: number;
};

export type PatchBudgetMonthBaseSavingsRequestDto = {
  amountMonthly: number;
  scope?: ExpenseEditScope;
};

export type BudgetMonthBaseSavingsEditorDto = {
  monthlyAmount: number;
  isMonthOnly: boolean;
};

export type DebtEditScope = ExpenseEditScope;

export type BudgetMonthDebtEditorRowDto = {
  id: string;
  sourceDebtId: string | null;
  name: string;
  type: string;
  balance: number;
  apr: number;
  monthlyFee: number | null;
  minPayment: number | null;
  termMonths: number | null;
  monthlyPayment: number;
  status: string;
  isDeleted: boolean;
  isMonthOnly: boolean;
  canUpdateDefault: boolean;
};

export type PatchBudgetMonthDebtRequestDto = {
  monthlyPayment: number;
  scope?: DebtEditScope | null;
};

export type PatchBudgetMonthDebtBulkRowDto = {
  monthDebtId: string;
  monthlyPayment: number;
  scope?: DebtEditScope | null;
};

export type PatchBudgetMonthDebtsBulkRequestDto = {
  items: PatchBudgetMonthDebtBulkRowDto[];
};

// Debt PR 2 — `POST /api/budgets/months/{ym}/debt-items`. Unlike income, the
// create endpoint accepts all three scopes: `budgetPlanOnly` is a real use
// case for debt (a debt that starts in future planning without touching the
// already-materialized current month). The backend resolves null/omitted to
// `currentMonthOnly`.
export type DebtCreateScope = DebtEditScope;

export type CreateBudgetMonthDebtRequestDto = {
  name: string;
  type: string;
  balance: number;
  apr: number;
  monthlyFee?: number | null;
  minPayment?: number | null;
  termMonths?: number | null;
  monthlyPayment: number;
  scope?: DebtCreateScope | null;
};

// Surfaces the baseline `Debt` plan row after a Debt PR 2 create that wrote
// the plan side — either alongside a current-month row
// (`currentMonthAndBudgetPlan`) or on its own (`budgetPlanOnly`).
export type DebtSourceSummaryDto = {
  sourceDebtId: string;
  name: string;
  type: string;
  balance: number;
  apr: number;
  monthlyFee: number | null;
  minPayment: number | null;
  termMonths: number | null;
  monthlyPayment: number;
};

// One of the two payload halves is always populated; both are populated when
// the create wrote a current-month row and a baseline plan row in the same
// transaction. The frontend should not infer the create scope from the nulls
// — the create call already carried the user's chosen scope.
export type CreateBudgetMonthDebtResponseDto = {
  monthRow: BudgetMonthDebtEditorRowDto | null;
  source: DebtSourceSummaryDto | null;
};

// Debt PR 2 — `PATCH .../debt-items/{id}/details`. Distinct from the
// planned-payment-only PATCH route (`PatchBudgetMonthDebtRequestDto`); detail
// edits never move balance — PR 3's `Uppdatera saldo` endpoint owns that.
export type PatchBudgetMonthDebtDetailsRequestDto = {
  name: string;
  type: string;
  apr: number;
  monthlyFee?: number | null;
  minPayment?: number | null;
  termMonths?: number | null;
  monthlyPayment: number;
  scope?: DebtEditScope | null;
};

// Debt PR 4 / PR 8 — lifecycle and month-participation commands. Each is a
// `POST` (append-only audit event) and shares one response shape so the FE
// can tell, without a follow-up GET, what changed: participation, source
// lifecycle, and — only for a `mark-paid-off` that zeroed the balance — the
// balance pair. `monthlyPayment` is echoed unchanged so the UI can never
// confuse a lifecycle change with a payment edit.

// Only `included` / `notIncluded` are reachable from the toggle. `removed` is
// reached exclusively via the dedicated remove command — keep them apart so
// skip/include can never accidentally delete a row.
export type DebtParticipationValue = "included" | "notIncluded";

export type SetBudgetMonthDebtParticipationRequestDto = {
  participation: DebtParticipationValue;
  note?: string | null;
};

export type MarkBudgetMonthDebtPaidOffRequestDto = {
  // Opt-in. Marking paid off is a status decision, not proof of a real
  // payment — so the user must explicitly ask to drive the balance to 0,
  // which the backend records as a separate, audited balance correction.
  setBalanceToZero: boolean;
  note?: string | null;
};

export type ArchiveBudgetMonthDebtRequestDto = {
  note?: string | null;
};

export type RestoreBudgetMonthDebtRequestDto = {
  // When true the current open month's row also flips back to `included`,
  // restoring its planned payment to the dashboard total in the same call.
  reIncludeCurrentMonth: boolean;
  note?: string | null;
};

export type RemoveBudgetMonthDebtRequestDto = {
  note?: string | null;
};

export type BudgetMonthDebtLifecycleActionResponseDto = {
  monthDebtId: string;
  sourceDebtId: string | null;
  action: string;
  previousParticipationStatus: string | null;
  participationStatus: string;
  previousSourceLifecycleStatus: string | null;
  sourceLifecycleStatus: string | null;
  balanceUpdated: boolean;
  oldMonthBalance: number | null;
  newMonthBalance: number | null;
  oldSourceBalance: number | null;
  newSourceBalance: number | null;
  monthlyPayment: number;
  changedAt: string;
};

// Debt PR 3 / PR 9 — `Uppdatera saldo`
// (`POST .../debt-items/{id}/balance-adjustments`). Mirrors
// `AdjustBudgetMonthDebtBalanceRequestDto` in the backend.
//
// `newBalance` is the absolute new liability snapshot, never a delta — the
// drawer is framed as a calm correction where the user types the value their
// lender currently shows. `scope` reuses the three editor scopes; month-only
// rows must keep it `currentMonthOnly`. `note` is the optional rättelse
// reason (≤ 500 chars).
export type AdjustBudgetMonthDebtBalanceRequestDto = {
  newBalance: number;
  scope?: DebtEditScope | null;
  note?: string | null;
};

// Debt PR 3 / PR 9 response. Each side reports its own old/new/delta because
// month and plan balances can legitimately diverge; the two `*Updated` flags
// make a no-op side explicit instead of forcing a delta-vs-zero guess.
// `monthlyPayment` is echoed unchanged so the FE can prove the planned-payment
// value did not move — the "saldo påverkas inte" promise in the inverse
// direction.
export type AdjustBudgetMonthDebtBalanceResponseDto = {
  monthDebtId: string;
  sourceDebtId: string | null;
  scope: string;
  monthBalanceUpdated: boolean;
  oldMonthBalance: number | null;
  newMonthBalance: number | null;
  monthDelta: number | null;
  sourceBalanceUpdated: boolean;
  oldSourceBalance: number | null;
  newSourceBalance: number | null;
  sourceDelta: number | null;
  monthlyPayment: number;
  changedAt: string;
};

export type ApiErrorDto = {
  code: string;
  message: string;
};

export type ApiEnvelope<T> = {
  data: T | null;
  isSuccess: boolean;
  error: ApiErrorDto | null;
  info: unknown;
};
