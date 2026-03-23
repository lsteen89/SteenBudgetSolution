import { calculateMonthlyContribution } from "@/utils/budget/financialCalculations";
import { parseIsoDateLocal } from "@/utils/dates/parseIsoDateLocal";
import { asCategoryKey, labelCategory } from "@/utils/i18n/budget/categories";
import type { CurrencyCode } from "@/utils/money/currency";
import type { BudgetDashboardMonthDto } from "@myTypes//budget/BudgetDashboardMonthDto";
import type {
  BreakdownItem,
  DashboardSummaryAggregate,
} from "./dashboardSummary.types";

import type { AppLocale } from "@/types/i18n/appLocale";
import { labelLedgerItem } from "@/utils/i18n/budget/ledgerItems";
import { incomeToBreakdownItems } from "./dashboardBreakdown.mapper";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const num0 = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;
// "YYYY-MM" -> Swedish month label
function ymLabel(ym: string, locale: AppLocale) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleDateString(locale, { year: "numeric", month: "long" });
}

export function buildDashboardSummaryAggregate(
  dto: BudgetDashboardMonthDto,
  currency: CurrencyCode,
  locale: AppLocale,
): DashboardSummaryAggregate {
  const monthLabel = ymLabel(dto.month.yearMonth, locale);

  // CLOSED MONTH: no detail objects, only snapshotTotals.
  if (dto.month.status === "closed" && dto.snapshotTotals) {
    const finalBalance = dto.snapshotTotals.finalBalanceMonthly;

    return {
      summary: {
        monthLabel,
        remainingToSpend: finalBalance,
        currency: currency,

        // these "extras" aren't available without goals data → keep harmless defaults
        emergencyFundAmount: 0,
        emergencyFundMonths: 0,
        goalsProgressPercent: 0,

        totalIncome: dto.snapshotTotals.totalIncomeMonthly,
        totalExpenditure: dto.snapshotTotals.totalExpensesMonthly,

        habitSavings: 0,
        goalSavings: 0,
        totalSavings: dto.snapshotTotals.totalSavingsMonthly,

        totalDebtPayments: dto.snapshotTotals.totalDebtPaymentsMonthly,
        finalBalance,

        subscriptionsTotal: 0,
        subscriptionsCount: 0,
        subscriptions: [],

        pillarDescriptions: {
          income: "Stängd månad (snapshot).",
          expenditure: "Stängd månad (snapshot).",
          savings: "Stängd månad (snapshot).",
          debts: "Stängd månad (snapshot).",
        },

        recurringExpenses: [],
      },
      breakdown: {
        incomeItems: [],
        expenseCategoryItems: [],
        savingsItems: [],
        debtItems: [],
      },
    };
  }

  // OPEN MONTH: liveDashboard exists
  const dashboard = dto.liveDashboard!;
  const totalIncome = num0(dashboard.income?.totalIncomeMonthly);
  const totalExpenditure = num0(dashboard.expenditure?.totalExpensesMonthly);

  const habitSavings = num0(dashboard.savings?.monthlySavings);

  const goals = dashboard.savings?.goals ?? [];
  const goalSavings = goals.reduce((acc, g) => {
    if (g.targetAmount == null || !g.targetDate) return acc;
    return (
      acc +
      calculateMonthlyContribution(
        g.targetAmount,
        g.amountSaved ?? 0,
        parseIsoDateLocal(g.targetDate),
      )
    );
  }, 0);

  const totalSavings = habitSavings + goalSavings;

  const debts = dashboard.debt?.debts ?? [];
  const totalDebtPayments = debts.reduce(
    (acc, d) => acc + num0(d.monthlyPayment),
    0,
  );

  const finalBalance = num0(dashboard.finalBalanceWithCarryMonthly);
  const remainingToSpend = finalBalance;

  const emergencyFundGoal = goals[0];
  const emergencyFundAmount = emergencyFundGoal?.amountSaved ?? 0;
  const emergencyFundMonths =
    totalExpenditure > 0 ? emergencyFundAmount / totalExpenditure : 0;

  const totalTarget = goals.reduce((acc, g) => acc + (g.targetAmount ?? 0), 0);
  const totalSaved = goals.reduce((acc, g) => acc + (g.amountSaved ?? 0), 0);
  const goalsProgressPercent =
    totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  const categories = dashboard.expenditure?.byCategory ?? [];
  const top3Names = [...categories]
    .sort((a, b) => b.totalMonthlyAmount - a.totalMonthlyAmount)
    .slice(0, 3)
    .map((c) =>
      labelCategory(asCategoryKey(c.categoryKey ?? c.categoryName), locale),
    )
    .join(", ");

  const pillarDescriptions = {
    income: "Från lön, sidoinkomster och andra källor i hushållet.",
    expenditure: top3Names
      ? `Dina största utgifter är ${top3Names}.`
      : "Du har inte lagt till några utgiftskategorier ännu.",
    savings: goals.length
      ? `Du sparar mot ${goals.length} mål.`
      : "Du har inte lagt upp några sparmål ännu.",
    debts:
      (dashboard.debt?.totalDebtBalance ?? 0) > 0
        ? `Totalt skuldsaldo: ${dashboard.debt!.totalDebtBalance.toLocaleString(locale)} kr.`
        : "Du har inga registrerade skulder just nu.",
  };

  const recurringExpenses =
    dashboard.recurringExpenses?.map((r) => {
      const categoryKey = asCategoryKey(r.categoryKey ?? r.categoryName);
      return {
        id: r.id,
        nameKey: r.name,
        nameLabel: labelLedgerItem(r.name, locale),
        categoryKey,
        categoryLabel: labelCategory(categoryKey, locale),
        amountMonthly: r.amountMonthly,
      };
    }) ?? [];

  const subscriptionsTotal = round2(
    dashboard.subscriptions?.totalMonthlyAmount ?? 0,
  );
  const subscriptionsCount = dashboard.subscriptions?.count ?? 0;
  const subscriptions =
    dashboard.subscriptions?.items?.map((s) => ({
      id: s.id,
      nameKey: s.name,
      nameLabel: s.name,
      categoryKey: "subscription" as const,
      categoryLabel: labelCategory("subscription", locale),
      amountMonthly: s.amountMonthly,
    })) ?? [];

  const incomeItems: BreakdownItem[] = dashboard.income
    ? incomeToBreakdownItems(dashboard.income)
    : [];

  const expenseCategoryItems: BreakdownItem[] = categories.map((c) => {
    const key = asCategoryKey(c.categoryKey ?? c.categoryName);
    return {
      key: `expense:${key}`,
      label: labelCategory(key, locale),
      amount: c.totalMonthlyAmount,
    };
  });

  const savingsItems: BreakdownItem[] = [
    { key: "savings:habit", label: "Månadssparande", amount: habitSavings },
    {
      key: "savings:goals",
      label: "Målsparande per månad",
      amount: goalSavings,
    },
  ].filter((x) => x.amount !== 0);

  const debtItems: BreakdownItem[] = debts
    .map((d) => ({
      key: `debt:${d.id}`,
      label: d.name,
      amount: d.monthlyPayment ?? 0,
      meta:
        d.balance != null
          ? `Saldo: ${d.balance.toLocaleString("sv-SE")} kr`
          : undefined,
    }))
    .filter((x) => x.amount !== 0);

  return {
    summary: {
      monthLabel,
      remainingToSpend,
      currency: currency,

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
