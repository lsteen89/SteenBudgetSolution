import { useMemo } from "react";
import { useWizardDataStore } from "@/stores/Wizard/wizardDataStore";
import { getExpenditureCategoryTotals } from "@/utils/budget/expenditureTotals";
import { calculateTotalMonthlySavings } from "@/utils/budget/financialCalculations";
import { summariseDebts } from "@/utils/budget/debtCalculations";
import { calcMonthlyIncome } from "@/utils/wizard/wizardHelpers";
import type { SavingsGoal } from "@/types/Wizard/SavingsFormValues";
import type { Goal } from "@/types/Wizard/goal";

type StrictSavingsGoal = {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string; // ISO
  amountSaved?: number | null;
};

const isGoalUsable = (g: SavingsGoal): g is StrictSavingsGoal =>
  g != null &&
  !!g.id &&
  !!g.name &&
  g.targetAmount != null &&
  g.targetAmount > 0 &&
  !!g.targetDate;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function useBudgetSummary() {
  const data = useWizardDataStore((s) => s.data);

  return useMemo(() => {
    const { income, expenditure, savings, debts } = data;

    // Income
    const totalIncome = round2(calcMonthlyIncome(income));

    // Expenditure (categories + total)
    const exp = getExpenditureCategoryTotals(expenditure);
    const totalExpenditure = round2(exp.total);

    // Savings
    const goals: Goal[] = (savings.goals ?? [])
      .filter(isGoalUsable)
      .map((g) => ({
        id: g.id,
        name: g.name,
        targetAmount: g.targetAmount,
        amountSaved: g.amountSaved ?? 0,      // IMPORTANT: null => 0
        targetDate: new Date(g.targetDate),   // Goal expects Date
      }));

    const goalSavings = round2(calculateTotalMonthlySavings(goals));
    const habitSavings = round2(savings.habits?.monthlySavings ?? 0);
    const totalSavings = round2(goalSavings + habitSavings);

    // Debts
    const debtSummary = summariseDebts(debts.debts ?? []);
    const totalDebtPayments = round2(debtSummary.totalMonthlyPayment);

    // Final
    const finalBalance = round2(
      totalIncome - totalExpenditure - totalSavings - totalDebtPayments
    );

    // UI rows
    const categoryRows = [
      { label: "Boende", value: round2(exp.housing) },
      { label: "Transport", value: round2(exp.transport) },
      { label: "Mat", value: round2(exp.food) },
      { label: "Fasta Utgifter", value: round2(exp.fixed) },
      { label: "Prenumerationer", value: round2(exp.subscriptions) },
      { label: "Rörliga Utgifter", value: round2(exp.variable) },
    ].filter((r) => r.value > 0);

    const breakdownRows = [
      { label: "Inkomster", value: totalIncome },
      { label: "Utgifter", value: -totalExpenditure },
      { label: "Sparande", value: -totalSavings },
      { label: "Skuldbetalningar", value: -totalDebtPayments },
    ];

    return {
      // raw totals
      totalIncome,
      exp,
      totalExpenditure,
      goals,
      goalSavings,
      habitSavings,
      totalSavings,
      debtSummary,
      totalDebtPayments,
      finalBalance,

      // UI helpers
      categoryRows,
      breakdownRows,
    };
  }, [data]);
}
