export interface IncomeOverviewDto {
    netSalaryMonthly: number;
    sideHustleMonthly: number;
    totalIncomeMonthly: number;
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
}

export interface DebtOverviewDto {
    totalDebtBalance: number;
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

export interface BudgetDashboardDto {
    budgetId: string;
    income: IncomeOverviewDto;
    expenditure: ExpenditureOverviewDto;
    savings?: SavingsOverviewDto | null;
    debt: DebtOverviewDto;
    disposableAfterExpenses: number;
    disposableAfterExpensesAndSavings: number;
}
