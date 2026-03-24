import type { CurrencyCode } from "@/utils/money/currency";

export type BudgetPeriodStatus = "open" | "closed" | "skipped";
export type HeaderLifecycleState =
  | "normal"
  | "upcoming"
  | "eligible"
  | "overdue";

export interface RecurringExpenseSummary {
  id: string;
  nameKey: string;
  nameLabel: string;
  categoryKey: string;
  categoryLabel: string;
  amountMonthly: number;
}

export interface DashboardPeriodHeaderSummary {
  periodKey: string;
  periodLabel: string;
  periodDateRangeLabel: string;
  periodStatus: BudgetPeriodStatus;

  previousPeriodLabel?: string | null;
  nextPeriodLabel?: string | null;

  canGoPrevious: boolean;
  canGoNext: boolean;

  canAdvancePeriod: boolean;
  advanceButtonLabel?: string | null;

  lifecycleState: HeaderLifecycleState;
  noticeText?: string | null;

  closeEligibleAt?: string | null;
}

export interface DashboardSummary {
  header: DashboardPeriodHeaderSummary;

  remainingToSpend: number;
  currency: CurrencyCode;

  emergencyFundAmount: number;
  emergencyFundMonths: number;
  goalsProgressPercent: number;

  totalIncome: number;
  totalExpenditure: number;

  habitSavings: number;
  goalSavings: number;
  totalSavings: number;

  totalDebtPayments: number;
  finalBalance: number;

  subscriptionsTotal: number;
  subscriptionsCount: number;
  subscriptions: RecurringExpenseSummary[];

  pillarDescriptions: {
    income: string;
    expenditure: string;
    savings: string;
    debts: string;
  };

  recurringExpenses: RecurringExpenseSummary[];
}

export type BreakdownItem = {
  key: string;
  label: string;
  amount: number;
  meta?: string;
};

export type DashboardBreakdown = {
  incomeItems: BreakdownItem[];
  expenseCategoryItems: BreakdownItem[];
  savingsItems: BreakdownItem[];
  debtItems: BreakdownItem[];
};

export type DashboardSummaryAggregate = {
  summary: DashboardSummary;
  breakdown: DashboardBreakdown;
};
