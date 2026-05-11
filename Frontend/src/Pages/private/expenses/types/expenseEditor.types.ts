import type { SubscriptionLifecycleStatus } from "@/types/budget/BudgetMonthsStatusDto";

export type ExpenseLedgerGroupKey = "fixed" | "variable" | "subscription";

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
};

export type ExpenseLedgerGroupVm = {
  key: ExpenseLedgerGroupKey;
  title: string;
  rows: ExpenseLedgerRowVm[];
  total: number;
};
