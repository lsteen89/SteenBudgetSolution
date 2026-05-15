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
  isDeleted: boolean;
  isMonthOnly: boolean;
  canUpdateDefault: boolean;
};

export type PatchBudgetMonthSavingsGoalRequestDto = {
  monthlyContribution: number;
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
