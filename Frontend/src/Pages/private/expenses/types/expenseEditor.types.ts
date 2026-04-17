export type ExpenseLedgerGroupKey = "fixed" | "variable" | "subscription";

export type ExpenseLedgerRowVm = {
  id: string;
  name: string;
  categoryId: string;
  categoryLabel: string;
  categoryKey: string;
  amountMonthly: number;
  isActive: boolean;
  isDeleted: boolean;
  group: ExpenseLedgerGroupKey;
};

export type ExpenseLedgerGroupVm = {
  key: ExpenseLedgerGroupKey;
  title: string;
  rows: ExpenseLedgerRowVm[];
  total: number;
};
