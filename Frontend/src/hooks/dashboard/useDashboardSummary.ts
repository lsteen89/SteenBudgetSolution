import { useEffect, useMemo } from "react";
import { useBudgetDashboardStore } from "@/stores/Budget/budgetDashboardStore";
import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import { calculateMonthlyContribution } from "@/utils/budget/financialCalculations";

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

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const buildDashboardSummary = (dashboard: BudgetDashboardDto): DashboardSummary => {
    const now = new Date();
    const monthLabel = now.toLocaleDateString("sv-SE", { year: "numeric", month: "long" });
    const remainingCurrency = "kr";

    const totalIncome = dashboard.income?.totalIncomeMonthly ?? 0;
    const totalExpenditure = dashboard.expenditure?.totalExpensesMonthly ?? 0;

    const habitSavings = dashboard.savings?.monthlySavings ?? 0;

    const goals = dashboard.savings?.goals ?? [];
    const goalSavings = goals.reduce((acc, g) => {
        if (g.targetAmount == null || !g.targetDate) return acc;
        return acc + calculateMonthlyContribution(
            g.targetAmount,
            g.amountSaved ?? 0,
            parseIsoDateLocal(g.targetDate)
        );
    }, 0);

    const totalSavings = habitSavings + goalSavings;

    const debts = dashboard.debt?.debts ?? [];
    const totalDebtPayments = debts.reduce((acc, d) => acc + (d.monthlyPayment ?? 0), 0);

    // Round at the end (less drift)
    const finalBalance = totalIncome - totalExpenditure - totalSavings - totalDebtPayments;

    const remainingToSpend = finalBalance;

    // Emergency fund (keep naive for now)
    const emergencyFundGoal = goals[0];
    const emergencyFundAmount = emergencyFundGoal?.amountSaved ?? 0;
    const emergencyFundMonths = totalExpenditure > 0 ? emergencyFundAmount / totalExpenditure : 0;

    // Goal progress %
    const totalTarget = goals.reduce((acc, g) => acc + (g.targetAmount ?? 0), 0);
    const totalSaved = goals.reduce((acc, g) => acc + (g.amountSaved ?? 0), 0);
    const goalsProgressPercent = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

    const categories = dashboard.expenditure?.byCategory ?? [];
    const top3Names = [...categories]
        .sort((a, b) => b.totalMonthlyAmount - a.totalMonthlyAmount)
        .slice(0, 3)
        .map((c) => c.categoryName)
        .join(", ");

    const pillarDescriptions = {
        income: "Från lön, sidoinkomster och andra källor i hushållet.",
        expenditure: top3Names
            ? `Dina största utgifter är ${top3Names}.`
            : "Du har inte lagt till några utgiftskategorier ännu.",
        savings: goals.length
            ? `Du sparar mot ${goals.length} mål.`
            : "Du har inte lagt upp några sparmål ännu.",
        debts: dashboard.debt?.totalDebtBalance > 0
            ? `Totalt skuldsaldo: ${dashboard.debt.totalDebtBalance.toLocaleString("sv-SE")} kr.`
            : "Du har inga registrerade skulder just nu.",
    };

    const recurringExpenses =
        dashboard.recurringExpenses?.map((r) => ({
            id: r.id,
            name: r.name,
            categoryName: r.categoryName,
            amountMonthly: r.amountMonthly,
        })) ?? [];

    const subscriptionsTotal = round2(dashboard.subscriptions?.totalMonthlyAmount ?? 0);
    const subscriptionsCount = dashboard.subscriptions?.count ?? 0;

    const subscriptions =
        dashboard.subscriptions?.items?.map(s => ({
            id: s.id,
            name: s.name,
            categoryName: "Subscription",
            amountMonthly: s.amountMonthly,
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
        habitSavings,
        goalSavings,
        totalSavings,
        totalDebtPayments,
        finalBalance,

        pillarDescriptions,
        recurringExpenses,

        subscriptionsTotal,
        subscriptionsCount,
        subscriptions,
    };
};
const parseIsoDateLocal = (iso: string) => {
    // Handles "2026-12-13" or "2026-12-13T00:00:00"
    const [datePart] = iso.split("T");
    const [y, m, d] = datePart.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1); // local midnight, no timezone surprises
};

export const useDashboardSummary = () => {
    const { dashboard, status, error, loadDashboard } = useBudgetDashboardStore();

    const dev = import.meta.env.MODE === "development";
    const mock = dev ? new URLSearchParams(window.location.search).get("mockDashboard") : null;

    useEffect(() => {
        if (status === "idle") void loadDashboard();
    }, [status, loadDashboard]);

    const data = useMemo(() => (dashboard ? buildDashboardSummary(dashboard) : null), [dashboard]);

    if (mock === "loading") return { data: null, status: "loading" as const, error: null, refetch: () => loadDashboard({ force: true }) };
    if (mock === "notfound") return { data: null, status: "notfound" as const, error: null, refetch: () => loadDashboard({ force: true }) };
    if (mock === "error") return {
        data: null,
        status: "error" as const,
        error: { message: "Simulated error", code: "SIMULATED", status: 500 },
        refetch: () => loadDashboard({ force: true }),
    };
    if (mock === "ready" && data) return { data, status: "ready" as const, error: null, refetch: () => loadDashboard({ force: true }) };

    return {
        data,
        status,
        error,
        refetch: () => loadDashboard({ force: true }),
    };
};