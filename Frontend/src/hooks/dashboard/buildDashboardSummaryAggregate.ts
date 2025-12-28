import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import { calculateMonthlyContribution } from "@/utils/budget/financialCalculations";
import { parseIsoDateLocal } from "@/utils/dates/parseIsoDateLocal";
import type { DashboardSummaryAggregate, BreakdownItem } from "./dashboardSummary.types";
import type { CurrencyCode } from "@/utils/money/currency";

/*
Note: The "kr" inside pillarDescriptions.debts is fine for now since it’s just a Swedish sentence. 
If we want it consistent, use formatMoneyV2(totalDebtBalance, currency) there later.
*/
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function buildDashboardSummaryAggregate(
    dashboard: BudgetDashboardDto,
    now = new Date(),
    currency: CurrencyCode = "SEK"
): DashboardSummaryAggregate {
    const monthLabel = now.toLocaleDateString("sv-SE", { year: "numeric", month: "long" });

    const totalIncome = dashboard.income?.totalIncomeMonthly ?? 0;
    const totalExpenditure = dashboard.expenditure?.totalExpensesMonthly ?? 0;

    const habitSavings = dashboard.savings?.monthlySavings ?? 0;

    const goals = dashboard.savings?.goals ?? [];
    const goalSavings = goals.reduce((acc, g) => {
        if (g.targetAmount == null || !g.targetDate) return acc;
        return (
            acc +
            calculateMonthlyContribution(
                g.targetAmount,
                g.amountSaved ?? 0,
                parseIsoDateLocal(g.targetDate)
            )
        );
    }, 0);

    const totalSavings = habitSavings + goalSavings;

    const debts = dashboard.debt?.debts ?? [];
    const totalDebtPayments = debts.reduce((acc, d) => acc + (d.monthlyPayment ?? 0), 0);

    const finalBalance = totalIncome - totalExpenditure - totalSavings - totalDebtPayments;
    const remainingToSpend = finalBalance;

    // Emergency fund (keep naive)
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
        savings: goals.length ? `Du sparar mot ${goals.length} mål.` : "Du har inte lagt upp några sparmål ännu.",
        debts:
            (dashboard.debt?.totalDebtBalance ?? 0) > 0
                ? `Totalt skuldsaldo: ${dashboard.debt!.totalDebtBalance.toLocaleString("sv-SE")} kr.`
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
        dashboard.subscriptions?.items?.map((s) => ({
            id: s.id,
            name: s.name,
            categoryName: "Subscription",
            amountMonthly: s.amountMonthly,
        })) ?? [];

    // -------- Breakdown arrays ----------
    const incomeItems: BreakdownItem[] = [
        { key: "income:total", label: "Totala inkomster", amount: totalIncome },
    ];

    const expenseCategoryItems: BreakdownItem[] = categories.map((c) => ({
        key: `expense:${c.categoryName}`,
        label: c.categoryName,
        amount: c.totalMonthlyAmount,
    }));

    const savingsItems: BreakdownItem[] = [
        { key: "savings:habit", label: "Månadssparande", amount: habitSavings },
        { key: "savings:goals", label: "Målsparande per månad", amount: goalSavings },
        // Optional: show per-goal monthly contribution (nice for BreakdownPage)
        ...goals
            .filter((g) => g.targetAmount != null && !!g.targetDate)
            .map((g, idx) => ({
                key: `savings:goal:${g.id ?? idx}`,
                label: g.name ? `Mål: ${g.name}` : `Mål ${idx + 1}`,
                amount: calculateMonthlyContribution(
                    g.targetAmount!,
                    g.amountSaved ?? 0,
                    parseIsoDateLocal(g.targetDate!)
                ),
                meta: g.targetAmount != null ? `Mål: ${g.targetAmount.toLocaleString("sv-SE")} kr` : undefined,
            })),
    ].filter((x) => x.amount !== 0);

    const debtItems: BreakdownItem[] = debts
        .map((d) => ({
            key: `debt:${d.id}`,
            label: d.name,
            amount: d.monthlyPayment ?? 0,
            meta: d.balance != null ? `Saldo: ${d.balance.toLocaleString("sv-SE")} kr` : undefined,
        }))
        .filter((x) => x.amount !== 0);

    return {
        summary: {
            monthLabel,
            remainingToSpend,
            remainingCurrency: currency,

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

            subscriptionsTotal,
            subscriptionsCount,
            subscriptions,

            pillarDescriptions,
            recurringExpenses,
        },
        breakdown: {
            incomeItems,
            expenseCategoryItems,
            savingsItems,
            debtItems,
        },
    };
}
