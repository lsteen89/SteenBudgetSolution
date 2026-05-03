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
  summary: BudgetMonthRecapComparisonSummaryDto | null;
};

export type BudgetMonthRecapComparisonSummaryDto = {
  income: BudgetMonthRecapMetricComparisonDto;
  expenses: BudgetMonthRecapMetricComparisonDto;
  savings: BudgetMonthRecapMetricComparisonDto;
  debtPayments: BudgetMonthRecapMetricComparisonDto;
  finalBalance: BudgetMonthRecapMetricComparisonDto;
};

export type BudgetMonthRecapMetricComparisonDto = {
  previousValue: number;
  deltaAmount: number;
  deltaPercent: number | null;
};

export type BudgetMonthRecapDto = {
  month: BudgetMonthRecapMetaDto;
  snapshotTotals: BudgetMonthRecapSnapshotTotalsDto;
  comparison: BudgetMonthRecapComparisonMetaDto;
};
