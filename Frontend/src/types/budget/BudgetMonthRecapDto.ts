import type { BudgetMonthStatus, CarryOverMode } from "./BudgetMonthsStatusDto";

export type BudgetMonthRecapMetaDto = {
  yearMonth: string;
  status: BudgetMonthStatus;
  openedAtUtc: string;
  closedAtUtc: string | null;
  carryOverMode: CarryOverMode;
  carryOverAmount: number | null;
};

export type BudgetMonthRecapSnapshotTotalsDto = {
  totalIncomeMonthly: number;
  totalExpensesMonthly: number;
  totalSavingsMonthly: number;
  totalDebtPaymentsMonthly: number;
  finalBalanceMonthly: number;
};

export type BudgetMonthRecapComparisonMetaDto = {
  previousComparableYearMonth: string | null;
  hasPreviousComparableMonth: boolean;
};

export type BudgetMonthRecapDto = {
  month: BudgetMonthRecapMetaDto;
  snapshotTotals: BudgetMonthRecapSnapshotTotalsDto;
  comparison: BudgetMonthRecapComparisonMetaDto;
};
