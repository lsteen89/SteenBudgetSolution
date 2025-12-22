import { buildCoreSummary, type CoreGoal } from "@/domain/budget/budgetSummaryCore";
import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import { parseIsoDateLocal } from "@/utils/dates/parseIsoDateLocal";

export function buildDashboardCoreSummary(d: BudgetDashboardDto) {
    const goals: CoreGoal[] = (d.savings?.goals ?? [])
        .filter(g => g.targetAmount != null && g.targetAmount > 0 && !!g.targetDate)
        .map(g => ({
            targetAmount: g.targetAmount!,
            amountSaved: g.amountSaved ?? 0,
            targetDate: parseIsoDateLocal(g.targetDate!),
        }));

    const totalDebtPaymentsMonthly =
        (d.debt?.debts ?? []).reduce((acc, x) => acc + (x.monthlyPayment ?? 0), 0);

    return buildCoreSummary({
        currency: "kr",
        totalIncomeMonthly: d.income?.totalIncomeMonthly ?? 0,
        totalExpenditureMonthly: d.expenditure?.totalExpensesMonthly ?? 0,
        habitSavingsMonthly: d.savings?.monthlySavings ?? 0,
        goals,
        totalDebtPaymentsMonthly,
    });
}