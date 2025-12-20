import { calculateMonthlyContribution } from "@/utils/budget/financialCalculations";

export type Currency = "kr";

export interface CoreGoal {
    targetAmount: number;
    amountSaved: number;
    targetDate: Date;
}

export interface CoreInputs {
    currency: Currency;
    totalIncomeMonthly: number;
    totalExpenditureMonthly: number;
    habitSavingsMonthly: number;
    goals: CoreGoal[];
    totalDebtPaymentsMonthly: number; // wizard can compute via summariseDebts
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function buildCoreSummary(i: CoreInputs) {
    const goalSavings = round2(
        (i.goals ?? []).reduce((acc, g) => {
            const m = calculateMonthlyContribution(g.targetAmount, g.amountSaved, g.targetDate);
            return acc + m;
        }, 0)
    );

    const habitSavings = round2(i.habitSavingsMonthly ?? 0);
    const totalSavings = round2(goalSavings + habitSavings);

    const totalIncome = round2(i.totalIncomeMonthly ?? 0);
    const totalExpenditure = round2(i.totalExpenditureMonthly ?? 0);
    const totalDebtPayments = round2(i.totalDebtPaymentsMonthly ?? 0);

    const finalBalance = round2(totalIncome - totalExpenditure - totalSavings - totalDebtPayments);

    return {
        currency: i.currency,
        totalIncome,
        totalExpenditure,
        habitSavings,
        goalSavings,
        totalSavings,
        totalDebtPayments,
        finalBalance,
    };
}
