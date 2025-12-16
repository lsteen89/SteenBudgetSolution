import { useEffect, useMemo } from 'react';
import { useBudgetDashboardStore } from '@/stores/Budget/budgetDashboardStore';
import type { BudgetDashboardDto } from '@/types/budget/BudgetDashboardDto';


export interface RecurringExpenseSummary {
    id: string;
    name: string;
    categoryName: string;
    amountMonthly: number;
}

export interface DashboardSummary {
    monthLabel: string;
    remainingToSpend: number;
    remainingCurrency: string;
    emergencyFundAmount: number;
    emergencyFundMonths: number;
    goalsProgressPercent: number;

    totalIncome: number;
    totalExpenditure: number;
    totalSavings: number;
    totalDebtPayments: number;
    finalBalance: number;
    pillarDescriptions: {
        income: string;
        expenditure: string;
        savings: string;
        debts: string;
    };
    recurringExpenses: RecurringExpenseSummary[];
}

const buildDashboardSummary = (dashboard: BudgetDashboardDto): DashboardSummary => {
    const now = new Date();
    const monthLabel = now.toLocaleDateString('sv-SE', {
        year: 'numeric',
        month: 'long',
    });

    const remainingCurrency = 'kr'; // TODO: from user settings

    const totalIncome =
        (dashboard.income?.netSalaryMonthly ?? 0) +
        (dashboard.income?.sideHustleMonthly ?? 0);

    const totalExpenditure = dashboard.expenditure?.totalExpensesMonthly ?? 0;
    const totalSavings = dashboard.savings?.monthlySavings ?? 0;

    // Until you model monthly debt payments, keep this 0 or compute from your debt DTO
    const totalDebtPayments = 0;

    const finalBalance =
        totalIncome - totalExpenditure - totalSavings - totalDebtPayments;

    const remainingToSpend =
        dashboard.disposableAfterExpensesAndSavings ?? finalBalance;

    // Emergency fund: naive = first goal
    const emergencyFundGoal = dashboard.savings?.goals?.[0];
    const emergencyFundAmount = emergencyFundGoal?.amountSaved ?? 0;
    const emergencyFundMonths =
        totalExpenditure > 0 ? emergencyFundAmount / totalExpenditure : 0;

    // Overall goal progress = sum(saved) / sum(target)
    const goals = dashboard.savings?.goals ?? [];
    const totalTarget = goals.reduce(
        (acc, g) => acc + (g.targetAmount ?? 0),
        0
    );
    const totalSaved = goals.reduce(
        (acc, g) => acc + (g.amountSaved ?? 0),
        0
    );
    const goalsProgressPercent =
        totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

    // Top 3 expense categories for the pillar description
    const categories = dashboard.expenditure?.byCategory ?? [];
    const top3Names = [...categories]
        .sort((a, b) => b.totalMonthlyAmount - a.totalMonthlyAmount)
        .slice(0, 3)
        .map((c) => c.categoryName)
        .join(', ');

    const pillarDescriptions = {
        income: 'Från lön, sidoinkomster och andra källor i hushållet.',
        expenditure: top3Names
            ? `Dina största utgifter är ${top3Names}.`
            : 'Du har inte lagt till några utgiftskategorier ännu.',
        savings: goals.length
            ? `Du sparar mot ${goals.length} specifika mål. Snyggt!`
            : 'Du har inte lagt upp några sparmål ännu.',
        debts:
            dashboard.debt?.totalDebtBalance && dashboard.debt.totalDebtBalance > 0
                ? `Totalt skuldsaldo: ${dashboard.debt.totalDebtBalance.toLocaleString(
                    'sv-SE'
                )} kr.`
                : 'Du har inga registrerade skulder just nu.',
    };
    const recurringExpenses: RecurringExpenseSummary[] =
        dashboard.recurringExpenses?.map((r) => ({
            id: r.id,
            name: r.name,
            categoryName: r.categoryName,
            amountMonthly: r.amountMonthly,
        })) ?? [];

    return {
        monthLabel,
        remainingToSpend,
        remainingCurrency,
        emergencyFundAmount,
        emergencyFundMonths,
        goalsProgressPercent,
        totalIncome,
        totalExpenditure,
        totalSavings,
        totalDebtPayments,
        finalBalance,
        pillarDescriptions,
        recurringExpenses,
    };
};

export const useDashboardSummary = () => {
    const { dashboard, isLoading, error, loadDashboard } =
        useBudgetDashboardStore();

    useEffect(() => {
        if (!dashboard && !isLoading && !error) {
            void loadDashboard();
        }
    }, [dashboard, isLoading, error, loadDashboard]);

    const data: DashboardSummary | null = useMemo(
        () => (dashboard ? buildDashboardSummary(dashboard) : null),
        [dashboard]
    );

    return {
        data,
        isLoading,
        isError: !!error,
    };
};