import type { CurrencyCode } from "@/utils/money/currency";

export interface RecurringExpenseSummary {
    id: string;
    nameKey: string;
    nameLabel: string;
    categoryKey: string;
    categoryLabel: string;
    amountMonthly: number;
}

export interface DashboardSummary {
    monthLabel: string;

    remainingToSpend: number;
    remainingCurrency: CurrencyCode;

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
    amount: number; // monthly amount (positive numbers)
    meta?: string;
};

export type DashboardBreakdown = {
    incomeItems: BreakdownItem[];
    expenseCategoryItems: BreakdownItem[];
    savingsItems: BreakdownItem[]; // habit + goal contributions (+ optional goal items)
    debtItems: BreakdownItem[];    // per-debt monthly payments
};

export type DashboardSummaryAggregate = {
    summary: DashboardSummary;
    breakdown: DashboardBreakdown;
};
