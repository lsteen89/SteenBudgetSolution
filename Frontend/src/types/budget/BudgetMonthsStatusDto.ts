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
