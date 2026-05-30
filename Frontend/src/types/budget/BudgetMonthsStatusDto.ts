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

export type CreateBudgetMonthIncomeItemRequestDto = {
  kind: Exclude<BudgetMonthIncomeItemKind, "salary">;
  name: string;
  amountMonthly: number;
  isActive: boolean;
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
