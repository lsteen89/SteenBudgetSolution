import type { BudgetDashboardDto } from "./BudgetDashboardDto";
import type { BudgetMonthStatus, CarryOverMode } from "./BudgetMonthsStatusDto";
import type { CurrencyCode } from "@/utils/money/currency";

export interface BudgetDashboardMonthDto {
    currencyCode: CurrencyCode;

    month: {
        yearMonth: string; // "YYYY-MM"
        status: BudgetMonthStatus;
        carryOverMode: CarryOverMode;
        carryOverAmount: number | null;
    };

    liveDashboard: BudgetDashboardDto | null;

    snapshotTotals: {
        totalIncomeMonthly: number;
        totalExpensesMonthly: number;
        totalSavingsMonthly: number;
        totalDebtPaymentsMonthly: number;
        finalBalanceMonthly: number;
    } | null;
}
