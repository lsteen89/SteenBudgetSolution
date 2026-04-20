import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import type { AppLocale } from "@/types/i18n/appLocale";
import { getEffectiveGoalMonthlyContribution } from "@/utils/budget/financialCalculations";
import { asCategoryKey, labelCategory } from "@/utils/i18n/budget/categories";
import { tDict } from "@/utils/i18n/translate";
import { finalSummaryDict } from "@/utils/i18n/wizard/stepFinal/finalSummaryDict.i18n";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

const kr = (n: number) => Math.round(n * 100) / 100;

export type SummaryRow = { id: string; label: string; value: number };
export type VerdictKind = "good" | "tight" | "bad";
export type HealthChip = { label: string; tone: "neutral" | "good" | "warn" };

export type CoachAction =
  | { kind: "none" }
  | { kind: "suggest"; title: string; detail: string }
  | {
      kind: "fix";
      title: string;
      detail: string;
      actionKey: "expenditure" | "savings" | "debts";
    };

export type FinalSummaryVm = {
  incomeRows: SummaryRow[];
  categoryRows: SummaryRow[];
  breakdownRows: SummaryRow[];
  finalBalance: number;

  totalIncome: number;
  totalExpenditure: number;
  totalSavings: number;
  totalDebtPayments: number;
  habitSavingsMonthly: number;
  goalSavingsMonthly: number;

  verdict: { kind: VerdictKind; title: string; detail: string };
  healthChips: HealthChip[];
  coach: CoachAction;

  pillarDescriptions: {
    income: string;
    expenditure: string;
    savings: string;
    debts: string;
  };
};

export function mapFinalizationPreviewToFinalSummary(
  dto: BudgetDashboardDto,
  locale: AppLocale,
  currency: CurrencyCode,
): FinalSummaryVm {
  const t = <K extends keyof typeof finalSummaryDict.sv>(k: K) =>
    tDict(k, locale, finalSummaryDict);

  const money0 = (v: number) =>
    formatMoneyV2(v ?? 0, currency, locale, { fractionDigits: 0 });

  const income = dto.income?.totalIncomeMonthly ?? 0;
  const expenses = dto.expenditure?.totalExpensesMonthly ?? 0;

  const habitSavings = dto.savings?.monthlySavings ?? 0;
  const goalSavings = (dto.savings?.goals ?? []).reduce(
    (acc, g: any) =>
      acc +
      getEffectiveGoalMonthlyContribution({
        monthlyContribution: g.monthlyContribution,
        targetAmount: g.targetAmount,
        amountSaved: g.amountSaved,
        targetDate: g.targetDate,
      }),
    0,
  );
  const totalSavings = kr(habitSavings + goalSavings);

  const debtPaymentsFromDto = dto.debt?.totalMonthlyPayments ?? 0;
  const debtPaymentsFromItems = kr(
    (dto.debt?.debts ?? []).reduce(
      (sum, d) => sum + (d.monthlyPayment ?? 0),
      0,
    ),
  );

  const debtPayments =
    debtPaymentsFromDto > 0 ? debtPaymentsFromDto : debtPaymentsFromItems;

  const finalBalance =
    dto.finalBalanceWithCarryMonthly ??
    kr(income - expenses - totalSavings - debtPayments);

  const categoryRows: SummaryRow[] = (dto.expenditure?.byCategory ?? []).map(
    (c: any) => {
      const key = asCategoryKey(c.categoryKey ?? c.categoryName);
      return {
        id: key,
        label: labelCategory(key, locale),
        value: -(c.totalMonthlyAmount ?? 0),
      };
    },
  );

  const incomeRows: SummaryRow[] = [
    {
      id: "salary",
      label: t("salaryNet"),
      value: dto.income?.netSalaryMonthly ?? 0,
    },

    ...(dto.income?.sideHustles ?? []).map((s: any) => ({
      id: `side-${s.id ?? s.name}`,
      label: s.name ?? t("sideIncome"),
      value: s.amountMonthly ?? 0,
    })),

    ...(dto.income?.householdMembers ?? []).map((m: any) => ({
      id: `member-${m.id ?? m.name}`,
      label: m.name ?? t("householdMember"),
      value: m.amountMonthly ?? 0,
    })),
  ].filter((r) => (r.value ?? 0) !== 0);

  const breakdownRows: SummaryRow[] = [
    { id: "income", label: t("rowIncome"), value: income },
    { id: "expenses", label: t("rowExpenses"), value: -expenses },
    { id: "savings", label: t("rowSavings"), value: -totalSavings },
    { id: "debts", label: t("rowDebtsMinimum"), value: -debtPayments },
  ].filter((r) => r.value !== 0);

  const habitSavingsMonthly = dto.savings?.monthlySavings ?? 0;
  const goalSavingsMonthly = (dto.savings?.goals ?? []).reduce(
    (a, g: any) =>
      a +
      getEffectiveGoalMonthlyContribution({
        monthlyContribution: g.monthlyContribution,
        targetAmount: g.targetAmount,
        amountSaved: g.amountSaved,
        targetDate: g.targetDate,
      }),
    0,
  );

  const savingsRate = income > 0 ? totalSavings / income : 0;

  const highestAprDebt = (dto.debt?.debts ?? []).reduce(
    (best: any, d: any) => ((d?.apr ?? 0) > (best?.apr ?? 0) ? d : best),
    null,
  );

  let verdictKind: VerdictKind = "good";
  if (finalBalance < 0) verdictKind = "bad";
  else if (finalBalance < income * 0.05) verdictKind = "tight";

  const verdict: FinalSummaryVm["verdict"] =
    verdictKind === "good"
      ? {
          kind: "good",
          title: t("verdictGoodTitle"),
          detail: t("verdictGoodDetail").replace(
            "{amount}",
            money0(finalBalance),
          ),
        }
      : verdictKind === "tight"
        ? {
            kind: "tight",
            title: t("verdictTightTitle"),
            detail: t("verdictTightDetail"),
          }
        : {
            kind: "bad",
            title: t("verdictBadTitle"),
            detail: t("verdictBadDetail"),
          };

  const healthChips: HealthChip[] = [
    {
      label: t("savingsRate").replace(
        "{percent}",
        (savingsRate * 100).toFixed(0),
      ),
      tone:
        savingsRate >= 0.15 ? "good" : savingsRate >= 0.05 ? "neutral" : "warn",
    },
    highestAprDebt?.apr
      ? {
          label: t("highInterest")
            .replace("{name}", String(highestAprDebt.name))
            .replace("{apr}", Number(highestAprDebt.apr).toFixed(1)),
          tone: Number(highestAprDebt.apr) >= 18 ? "warn" : "neutral",
        }
      : { label: t("noInterestFound"), tone: "neutral" },
  ];

  const coach: CoachAction =
    verdictKind === "bad"
      ? {
          kind: "fix",
          title: t("coachFixTitle"),
          detail: t("coachFixDetail"),
          actionKey: "savings",
        }
      : verdictKind === "tight"
        ? {
            kind: "suggest",
            title: t("coachSuggestTightTitle"),
            detail: t("coachSuggestTightDetail"),
          }
        : {
            kind: "suggest",
            title: t("coachSuggestGoodTitle"),
            detail: t("coachSuggestGoodDetail"),
          };

  return {
    categoryRows,
    breakdownRows,
    finalBalance,
    totalIncome: income,
    incomeRows,
    totalExpenditure: expenses,
    totalSavings,
    totalDebtPayments: debtPayments,

    habitSavingsMonthly,
    goalSavingsMonthly,
    verdict,
    healthChips,
    coach,

    pillarDescriptions: {
      income: t("pillarIncome"),
      expenditure: t("pillarExpenditure"),
      savings: dto.savings?.goals?.length
        ? t("pillarSavingsWithGoals").replace(
            "{count}",
            String(dto.savings.goals.length),
          )
        : t("pillarSavingsNoGoals"),
      debts: t("pillarDebts"),
    },
  };
}
