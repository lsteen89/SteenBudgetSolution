import type { AppLocale } from "@/types/i18n/appLocale";
import { calculateMonthlyContribution } from "@/utils/budget/financialCalculations";
import { parseIsoDateLocal } from "@/utils/dates/parseIsoDateLocal";
import { asCategoryKey, labelCategory } from "@/utils/i18n/budget/categories";
import { labelLedgerItem } from "@/utils/i18n/budget/ledgerItems";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import type { BudgetDashboardMonthDto } from "@myTypes/budget/BudgetDashboardMonthDto";

import { dashboardSummaryDict } from "@/utils/i18n/pages/private/dashboard/pages/dashboardSummaryDict.i18n";

import { incomeToBreakdownItems } from "./dashboardBreakdown.mapper";
import { getHeaderLifecycleState } from "./dashboardHeaderState";
import type {
  BreakdownItem,
  BudgetPeriodStatus,
  DashboardPeriodHeaderSummary,
  DashboardSummaryAggregate,
} from "./dashboardSummary.types";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const num0 = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

function ymLabel(ym: string, locale: AppLocale) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleDateString(locale, { year: "numeric", month: "long" });
}

function getSummaryT(locale: AppLocale) {
  return <K extends keyof typeof dashboardSummaryDict.sv>(key: K) =>
    tDict(key, locale, dashboardSummaryDict);
}

function buildHeaderSummary(
  yearMonth: string,
  status: BudgetPeriodStatus,
  locale: AppLocale,
): DashboardPeriodHeaderSummary {
  const t = getSummaryT(locale);

  return {
    periodKey: yearMonth,
    periodLabel: ymLabel(yearMonth, locale),
    periodDateRangeLabel: "", // TODO: backend period range metadata
    periodStatus: status,

    previousPeriodLabel: null,
    nextPeriodLabel: null,

    canGoPrevious: false,
    canGoNext: false,

    canAdvancePeriod: false, // TODO: backend lifecycle metadata
    advanceButtonLabel: null,

    lifecycleState: getHeaderLifecycleState({
      periodStatus: status,
      canAdvancePeriod: false,
      daysUntilEligible: null,
      daysSinceEligible: null,
    }),

    noticeText: null /*
      status === "closed"
        ? t("closedNotice")
        : status === "skipped"
          ? t("skippedNotice")
          : null,*/,

    closeEligibleAt: null,
  };
}

function requireLiveDashboard(dto: BudgetDashboardMonthDto) {
  if (!dto.liveDashboard) {
    throw new Error(
      `Month ${dto.month.yearMonth} is open but liveDashboard is missing.`,
    );
  }

  return dto.liveDashboard;
}

function requireSnapshotTotals(dto: BudgetDashboardMonthDto) {
  if (!dto.snapshotTotals) {
    throw new Error(
      `Month ${dto.month.yearMonth} is closed but snapshotTotals is missing.`,
    );
  }

  return dto.snapshotTotals;
}

function getGoalsProgressPercent(
  goals: Array<{ targetAmount?: number | null; amountSaved?: number | null }>,
) {
  const totalTarget = goals.reduce((acc, g) => acc + num0(g.targetAmount), 0);
  const totalSaved = goals.reduce((acc, g) => acc + num0(g.amountSaved), 0);

  return totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
}

function buildPillarDescriptions(
  dto: BudgetDashboardMonthDto,
  locale: AppLocale,
) {
  const t = <K extends keyof typeof dashboardSummaryDict.sv>(key: K) =>
    tDict(key, locale, dashboardSummaryDict);

  const dashboard = requireLiveDashboard(dto);
  const categories = dashboard.expenditure?.byCategory ?? [];
  const goals = dashboard.savings?.goals ?? [];
  const totalDebtBalance = num0(dashboard.debt?.totalDebtBalance);

  const top3Names = [...categories]
    .sort((a, b) => num0(b.totalMonthlyAmount) - num0(a.totalMonthlyAmount))
    .slice(0, 3)
    .map((c) =>
      labelCategory(asCategoryKey(c.categoryKey ?? c.categoryName), locale),
    )
    .join(", ");

  return {
    income: t("pillarIncomeDescription"),
    expenditure: top3Names
      ? t("pillarExpenditureTop3").replace("{names}", top3Names)
      : t("pillarExpenditureEmpty"),
    savings: goals.length
      ? t("pillarSavingsGoals").replace("{count}", String(goals.length))
      : t("pillarSavingsEmpty"),
    debts:
      totalDebtBalance > 0
        ? t("pillarDebtsTotalBalance").replace(
            "{amount}",
            totalDebtBalance.toLocaleString(locale),
          )
        : t("pillarDebtsEmpty"),
  };
}

function buildClosedMonthAggregate(
  dto: BudgetDashboardMonthDto,
  locale: AppLocale,
): DashboardSummaryAggregate {
  const t = <K extends keyof typeof dashboardSummaryDict.sv>(key: K) =>
    tDict(key, locale, dashboardSummaryDict);

  const snapshot = requireSnapshotTotals(dto);
  const currency = dto.currencyCode as CurrencyCode;

  const header = buildHeaderSummary(dto.month.yearMonth, "closed", locale);

  return {
    summary: {
      header,
      remainingToSpend: num0(snapshot.finalBalanceMonthly),
      currency,

      emergencyFundAmount: 0,
      emergencyFundMonths: 0,
      goalsProgressPercent: 0,

      totalIncome: num0(snapshot.totalIncomeMonthly),
      totalExpenditure: num0(snapshot.totalExpensesMonthly),

      habitSavings: 0,
      goalSavings: 0,
      totalSavings: num0(snapshot.totalSavingsMonthly),

      totalDebtPayments: num0(snapshot.totalDebtPaymentsMonthly),
      finalBalance: num0(snapshot.finalBalanceMonthly),

      subscriptionsTotal: 0,
      subscriptionsCount: 0,
      subscriptions: [],

      pillarDescriptions: {
        income: t("snapshotMonth"),
        expenditure: t("snapshotMonth"),
        savings: t("snapshotMonth"),
        debts: t("snapshotMonth"),
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

function buildSkippedMonthAggregate(
  dto: BudgetDashboardMonthDto,
  locale: AppLocale,
): DashboardSummaryAggregate {
  const t = <K extends keyof typeof dashboardSummaryDict.sv>(key: K) =>
    tDict(key, locale, dashboardSummaryDict);

  const currency = dto.currencyCode as CurrencyCode;

  const header = buildHeaderSummary(dto.month.yearMonth, "skipped", locale);

  return {
    summary: {
      header,
      remainingToSpend: 0,
      currency,

      emergencyFundAmount: 0,
      emergencyFundMonths: 0,
      goalsProgressPercent: 0,

      totalIncome: 0,
      totalExpenditure: 0,

      habitSavings: 0,
      goalSavings: 0,
      totalSavings: 0,

      totalDebtPayments: 0,
      finalBalance: 0,

      subscriptionsTotal: 0,
      subscriptionsCount: 0,
      subscriptions: [],

      pillarDescriptions: {
        income: t("skippedMonth"),
        expenditure: t("skippedMonth"),
        savings: t("skippedMonth"),
        debts: t("skippedMonth"),
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

function buildOpenMonthAggregate(
  dto: BudgetDashboardMonthDto,
  locale: AppLocale,
): DashboardSummaryAggregate {
  const t = <K extends keyof typeof dashboardSummaryDict.sv>(key: K) =>
    tDict(key, locale, dashboardSummaryDict);

  const dashboard = requireLiveDashboard(dto);
  const currency = dto.currencyCode as CurrencyCode;

  const header = buildHeaderSummary(dto.month.yearMonth, "open", locale);

  const totalIncome = num0(dashboard.income?.totalIncomeMonthly);
  const totalExpenditure = num0(dashboard.expenditure?.totalExpensesMonthly);
  const finalBalance = num0(dashboard.finalBalanceWithCarryMonthly);

  const goals = dashboard.savings?.goals ?? [];
  const debts = dashboard.debt?.debts ?? [];
  const categories = dashboard.expenditure?.byCategory ?? [];

  const habitSavings = num0(dashboard.savings?.monthlySavings);

  const goalSavings = round2(
    goals.reduce((acc, g) => {
      if (g.targetAmount == null || !g.targetDate) return acc;

      return (
        acc +
        calculateMonthlyContribution(
          g.targetAmount,
          g.amountSaved ?? 0,
          parseIsoDateLocal(g.targetDate),
        )
      );
    }, 0),
  );

  const totalSavings = round2(habitSavings + goalSavings);

  const totalDebtPayments = round2(
    debts.reduce((acc, d) => acc + num0(d.monthlyPayment), 0),
  );

  const recurringExpenses =
    dashboard.recurringExpenses?.map((r) => {
      const categoryKey = asCategoryKey(r.categoryKey ?? r.categoryName);

      return {
        id: r.id,
        nameKey: r.name,
        nameLabel: labelLedgerItem(r.name, locale),
        categoryKey,
        categoryLabel: labelCategory(categoryKey, locale),
        amountMonthly: num0(r.amountMonthly),
      };
    }) ?? [];

  const subscriptions =
    dashboard.subscriptions?.items?.map((s) => ({
      id: s.id,
      nameKey: s.name,
      nameLabel: s.name,
      categoryKey: "subscription" as const,
      categoryLabel: labelCategory("subscription", locale),
      amountMonthly: num0(s.amountMonthly),
    })) ?? [];

  const incomeItems: BreakdownItem[] = dashboard.income
    ? incomeToBreakdownItems(dashboard.income)
    : [];

  const expenseCategoryItems: BreakdownItem[] = categories.map((c) => {
    const key = asCategoryKey(c.categoryKey ?? c.categoryName);

    return {
      key: `expense:${key}`,
      label: labelCategory(key, locale),
      amount: num0(c.totalMonthlyAmount),
    };
  });

  const savingsItems: BreakdownItem[] = [
    { key: "savings:habit", label: t("monthlySavings"), amount: habitSavings },
    { key: "savings:goals", label: t("goalSavings"), amount: goalSavings },
  ].filter((x) => x.amount !== 0);

  const debtItems: BreakdownItem[] = debts
    .map((d) => ({
      key: `debt:${d.id}`,
      label: d.name,
      amount: num0(d.monthlyPayment),
      meta:
        d.balance != null
          ? t("debtBalance").replace(
              "{amount}",
              d.balance.toLocaleString(locale),
            )
          : undefined,
    }))
    .filter((x) => x.amount !== 0);

  const emergencyFundAmount = num0(goals[0]?.amountSaved);
  const emergencyFundMonths =
    totalExpenditure > 0 ? emergencyFundAmount / totalExpenditure : 0;

  return {
    summary: {
      header,
      remainingToSpend: finalBalance,
      currency,

      emergencyFundAmount,
      emergencyFundMonths,
      goalsProgressPercent: getGoalsProgressPercent(goals),

      totalIncome,
      totalExpenditure,

      habitSavings,
      goalSavings,
      totalSavings,

      totalDebtPayments,
      finalBalance,

      subscriptionsTotal: round2(
        num0(dashboard.subscriptions?.totalMonthlyAmount),
      ),
      subscriptionsCount: dashboard.subscriptions?.count ?? 0,
      subscriptions,

      pillarDescriptions: buildPillarDescriptions(dto, locale),
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

export function buildDashboardSummaryAggregate(
  dto: BudgetDashboardMonthDto,
  locale: AppLocale,
): DashboardSummaryAggregate {
  switch (dto.month.status) {
    case "open":
      return buildOpenMonthAggregate(dto, locale);
    case "closed":
      return buildClosedMonthAggregate(dto, locale);
    case "skipped":
      return buildSkippedMonthAggregate(dto, locale);
    default:
      throw new Error(
        `Unsupported dashboard month status: ${dto.month.status}`,
      );
  }
}
