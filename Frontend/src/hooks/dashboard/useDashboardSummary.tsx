// Frontend/src/hooks/dashboard/useDashboardSummary.ts
import { useEffect, useMemo } from 'react';
import { useBudgetDashboardStore } from '@/stores/Budget/budgetDashboardStore';

export interface DashboardSummary {
    monthLabel: string;
    remainingToSpend: number;
    remainingCurrency: string;
    emergencyFundAmount: number;
    emergencyFundMonths: number;
    goalsProgressPercent: number;
}

export const useDashboardSummary = () => {
    const {
        dashboard,
        isLoading,
        error,
        loadDashboard,
    } = useBudgetDashboardStore();

    // Kick off load on first use if nothing loaded yet
    useEffect(() => {
        if (!dashboard && !isLoading && !error) {
            void loadDashboard();
        }
    }, [dashboard, isLoading, error, loadDashboard]);

    const data: DashboardSummary | null = useMemo(() => {
        if (!dashboard) return null;

        const remainingToSpend = dashboard.disposableAfterExpensesAndSavings;
        const remainingCurrency = 'kr'; // TODO: plug into user settings / locale later

        const monthlyExpenses = dashboard.expenditure.totalExpensesMonthly;
        const emergencyFundGoal = dashboard.savings?.goals[0]; // naive: first goal is emergency fund

        const emergencyFundAmount = emergencyFundGoal?.amountSaved ?? 0;
        const emergencyFundMonths =
            monthlyExpenses > 0 ? emergencyFundAmount / monthlyExpenses : 0;

        // Naive placeholder until you define "overall goal progress"
        const goalsProgressPercent = 65;

        const now = new Date();
        const monthLabel = now.toLocaleDateString('sv-SE', {
            year: 'numeric',
            month: 'long',
        });

        return {
            monthLabel,
            remainingToSpend,
            remainingCurrency,
            emergencyFundAmount,
            emergencyFundMonths,
            goalsProgressPercent,
        };
    }, [dashboard]);

    return {
        data,
        isLoading,
        isError: !!error,
    };
};
