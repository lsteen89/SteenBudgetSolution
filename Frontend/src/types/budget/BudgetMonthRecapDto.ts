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

export type BudgetMonthRecapExpenseCategoryDto = {
  categoryId: string;
  categoryName: string;
  currentAmount: number;
  previousAmount: number | null;
  deltaAmount: number | null;
  deltaPercent: number | null;
};

export type BudgetMonthRecapSubscriptionInsightDto = {
  active: BudgetMonthRecapSubscriptionItemDto[];
  new: BudgetMonthRecapSubscriptionItemDto[];
  removed: BudgetMonthRecapSubscriptionItemDto[];
  paused: BudgetMonthRecapSubscriptionItemDto[];
  cancelled: BudgetMonthRecapSubscriptionItemDto[];
  hasPreviousComparableMonth: boolean;
};

export type BudgetMonthRecapSubscriptionItemDto = {
  identityKey: string;
  name: string;
  amountMonthly: number;
  sourceExpenseItemId: string | null;
};

export type BudgetMonthRecapSavingsDetailDto = {
  totalSavingsMonthly: number;
  activeGoals: BudgetMonthRecapSavingsGoalDto[];
  completedGoals: BudgetMonthRecapCompletedSavingsGoalDto[];
  hasPreviousComparableMonth: boolean;
};

// Snapshot of a goal that finished during this closed month. Display uses
// projectedAmountSaved (= raw amountSaved + monthlyContribution at close)
// as the canonical "reached this month" value — raw amountSaved is the
// stored, unmutated progression and must not be rendered as the final amount.
export type BudgetMonthRecapCompletedSavingsGoalDto = {
  id: string;
  name: string | null;
  targetAmount: number | null;
  amountSaved: number | null;
  monthlyContribution: number;
  projectedAmountSaved: number;
  closedAt: string;
};

export type BudgetMonthRecapSavingsGoalDto = {
  id: string;
  sourceSavingsGoalId: string | null;
  name: string | null;
  monthlyContribution: number;
  targetAmount: number | null;
  targetDate: string | null;
  amountSaved: number | null;
  previousMonthlyContribution: number | null;
  deltaMonthlyContribution: number | null;
};

export type BudgetMonthRecapDebtDetailDto = {
  totalDebtPaymentsMonthly: number;
  activeDebts: BudgetMonthRecapDebtItemDto[];
  hasPreviousComparableMonth: boolean;
};

export type BudgetMonthRecapDebtItemDto = {
  id: string;
  sourceDebtId: string | null;
  name: string;
  type: string;
  balance: number;
  apr: number;
  monthlyPayment: number;
  minPayment: number | null;
  monthlyFee: number | null;
  termMonths: number | null;
  previousMonthlyPayment: number | null;
  deltaMonthlyPayment: number | null;
};

export type BudgetMonthRecapExpenseDriverDto = {
  categoryId: string;
  categoryName: string;
  currentAmount: number;
  previousAmount: number;
  deltaAmount: number;
  deltaPercent: number | null;
};

export type BudgetMonthRecapInsightDriversDto = {
  expenseIncreaseDrivers: BudgetMonthRecapExpenseDriverDto[];
  largestExpenseIncreaseDriver: BudgetMonthRecapExpenseDriverDto | null;
};

// Explicit outcome of the carry-over decision recorded at close-time. The
// frontend should display carry-over from this DTO — `month.carryOverMode`
// and `month.carryOverAmount` are not reliable for `full` mode (Amount is
// stored as null on the next-month row).
export type BudgetMonthRecapCarryOverOutcomeDto = {
  mode: CarryOverMode;
  amount: number;
  targetYearMonth: string | null;
  wasApplied: boolean;
};

export type BudgetMonthRecapDto = {
  month: BudgetMonthRecapMetaDto;
  snapshotTotals: BudgetMonthRecapSnapshotTotalsDto;
  comparison: BudgetMonthRecapComparisonMetaDto;
  expenseCategories: BudgetMonthRecapExpenseCategoryDto[];
  subscriptionInsight: BudgetMonthRecapSubscriptionInsightDto;
  savingsDetail: BudgetMonthRecapSavingsDetailDto;
  debtDetail: BudgetMonthRecapDebtDetailDto;
  insightDrivers: BudgetMonthRecapInsightDriversDto;
  carryOverOutcome: BudgetMonthRecapCarryOverOutcomeDto;
};
