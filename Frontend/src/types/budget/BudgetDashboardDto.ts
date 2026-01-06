export interface DashboardIncomeItemDto {
    id: string;
    name: string;
    amountMonthly: number;
}

export interface IncomeOverviewDto {
    netSalaryMonthly: number;
    sideHustleMonthly: number;
    householdMembersMonthly: number;
    totalIncomeMonthly: number;

    sideHustles: DashboardIncomeItemDto[];
    householdMembers: DashboardIncomeItemDto[];
}

export interface ExpenseCategorySummaryDto {
    categoryName: string;
    totalMonthlyAmount: number;
}

export interface ExpenditureOverviewDto {
    totalExpensesMonthly: number;
    byCategory: ExpenseCategorySummaryDto[];
}

export interface DashboardDebtItemDto {
    id: string;
    name: string;
    type: string;
    balance: number;
    apr: number;
    monthlyPayment: number;
}

export interface DebtOverviewDto {
    totalDebtBalance: number;
    totalMonthlyPayments: number;
    debts: DashboardDebtItemDto[];
}

export interface DashboardSavingsGoalDto {
    id: string;
    name?: string | null;
    targetAmount?: number | null;
    targetDate?: string | null;   // ISO date string from BE
    amountSaved?: number | null;
}

export interface SavingsOverviewDto {
    monthlySavings: number;
    goals: DashboardSavingsGoalDto[];
}
export interface DashboardRecurringExpenseDto {
    id: string;
    name: string;
    categoryName: string;
    amountMonthly: number;
}
export interface DashboardSubscriptionDto {
    id: string;
    name: string;
    amountMonthly: number;
}

export interface SubscriptionsOverviewDto {
    totalMonthlyAmount: number;
    count: number;
    items: DashboardSubscriptionDto[];
}
export interface BudgetDashboardDto {
    budgetId: string;
    income: IncomeOverviewDto;
    expenditure: ExpenditureOverviewDto;
    savings?: SavingsOverviewDto | null;
    debt: DebtOverviewDto;
    disposableAfterExpenses: number;
    disposableAfterExpensesAndSavings: number;
    recurringExpenses: DashboardRecurringExpenseDto[];
    subscriptions: SubscriptionsOverviewDto;
}
