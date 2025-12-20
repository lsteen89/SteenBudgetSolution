import { useMemo } from "react";
import { useWizardDataStore } from "@/stores/Wizard/wizardDataStore";
import { getExpenditureCategoryTotals } from "@/utils/budget/expenditureTotals";
import { summariseDebts } from "@/utils/budget/debtCalculations";
import { calcMonthlyIncome } from "@/utils/wizard/wizardHelpers";
import type { SavingsGoal } from "@/types/Wizard/SavingsFormValues";
import { buildCoreSummary, type CoreGoal } from "@/domain/budget/budgetSummaryCore";

type StrictSavingsGoal = {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
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

    // Wizard-specific totals (still OK to compute here)
    const exp = getExpenditureCategoryTotals(expenditure);

    const goals: CoreGoal[] = (savings.goals ?? [])
      .filter(isGoalUsable)
      .map((g) => ({
        targetAmount: g.targetAmount,
        amountSaved: g.amountSaved ?? 0,
        targetDate: new Date(g.targetDate),
      }));

    const debtSummary = summariseDebts(debts.debts ?? []);

    // Map to core inputs
    const core = buildCoreSummary({
      currency: "kr",
      totalIncomeMonthly: calcMonthlyIncome(income),
      totalExpenditureMonthly: exp.total,
      habitSavingsMonthly: savings.habits?.monthlySavings ?? 0,
      goals,
      totalDebtPaymentsMonthly: debtSummary.totalMonthlyPayment,
    });

    // UI helpers (wizard-only)
    const categoryRows = [
      { label: "Boende", value: round2(exp.housing) },
      { label: "Transport", value: round2(exp.transport) },
      { label: "Mat", value: round2(exp.food) },
      { label: "Fasta Utgifter", value: round2(exp.fixed) },
      { label: "Prenumerationer", value: round2(exp.subscriptions) },
      { label: "Rörliga Utgifter", value: round2(exp.variable) },
    ].filter((r) => r.value > 0);

    const breakdownRows = [
      { label: "Inkomster", value: core.totalIncome },
      { label: "Utgifter", value: -core.totalExpenditure },
      { label: "Sparande", value: -core.totalSavings },
      { label: "Skuldbetalningar", value: -core.totalDebtPayments },
    ];

    return {
      // core summary (single source of truth totals)
      ...core,

      // wizard extras
      exp,
      goals,          // typed core goals (or rename to goalInputs)
      debtSummary,
      categoryRows,
      breakdownRows,
    };
  }, [data]);
}
