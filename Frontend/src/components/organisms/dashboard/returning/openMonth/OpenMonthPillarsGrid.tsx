import {
  Banknote,
  CreditCard,
  PiggyBank,
  ReceiptText,
} from "lucide-react";
import React from "react";

import type {
  BreakdownItem,
  DashboardBreakdown,
  DashboardSummary,
} from "@/hooks/dashboard/dashboardSummary.types";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { openMonthCommandCenterDict } from "@/utils/i18n/pages/private/dashboard/openMonth/OpenMonthCommandCenter.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import OpenMonthPillarCard from "./OpenMonthPillarCard";

type Props = {
  summary: DashboardSummary;
  breakdown: DashboardBreakdown;
  onOpenPeriodEditor: () => void;
  onOpenFullExpenseEditor: () => void;
  onOpenIncomeEditor: () => void;
  onOpenFullIncomeEditor: () => void;
  onOpenFullSavingsEditor: () => void;
};

function buildIncomeInsight(
  incomeItems: BreakdownItem[],
  formatAmount: (amount: number) => string,
  copy: {
    activeOne: string;
    activeOther: string;
    salary: string;
    other: string;
  },
) {
  const activeItems = incomeItems.filter((item) => Math.abs(item.amount) >= 0.005);
  if (activeItems.length === 0) return null;

  const salaryAmount = activeItems
    .filter((item) => item.key.includes(":salary"))
    .reduce((sum, item) => sum + item.amount, 0);
  const otherAmount = activeItems
    .filter((item) => !item.key.includes(":salary"))
    .reduce((sum, item) => sum + item.amount, 0);
  const parts = [
    (activeItems.length === 1 ? copy.activeOne : copy.activeOther).replace(
      "{count}",
      String(activeItems.length),
    ),
  ];

  if (salaryAmount > 0) {
    parts.push(`${copy.salary} ${formatAmount(salaryAmount)}`);
  }

  if (otherAmount > 0) {
    parts.push(`${copy.other} ${formatAmount(otherAmount)}`);
  }

  return parts.join(" · ");
}

const OpenMonthPillarsGrid: React.FC<Props> = ({
  summary,
  breakdown,
  onOpenPeriodEditor,
  onOpenFullExpenseEditor,
  onOpenIncomeEditor,
  onOpenFullIncomeEditor,
  onOpenFullSavingsEditor,
}) => {
  const locale = useAppLocale();
  const t = <K extends keyof typeof openMonthCommandCenterDict.sv>(key: K) =>
    tDict(key, locale, openMonthCommandCenterDict);
  const fmt = (amount: number) =>
    formatMoneyV2(amount, summary.currency, locale);
  const comingSoon = t("comingSoon");
  const hasSubscriptions =
    summary.subscriptionsCount > 0 && summary.subscriptionsTotal > 0;
  const subscriptionInsight = hasSubscriptions
    ? t("subscriptionInsight")
        .replace("{count}", String(summary.subscriptionsCount))
        .replace("{monthlyAmount}", fmt(summary.subscriptionsTotal))
        .replace("{annualAmount}", fmt(summary.subscriptionsTotal * 12))
    : null;
  const incomeInsight = buildIncomeInsight(breakdown.incomeItems, fmt, {
    activeOne: t("incomeInsightActiveOne"),
    activeOther: t("incomeInsightActiveOther"),
    salary: t("incomeInsightSalary"),
    other: t("incomeInsightOther"),
  });

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold text-eb-text">{t("pillarsTitle")}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <OpenMonthPillarCard
          title={t("incomeTitle")}
          amount={fmt(summary.totalIncome)}
          description={summary.pillarDescriptions.income || t("incomeHint")}
          icon={<Banknote className="h-5 w-5" />}
          actionLabel={t("quickAdjustIncome")}
          secondaryActionLabel={t("editAllIncome")}
          actionState="available"
          stateLabel={t("availableNow")}
          insight={
            incomeInsight ? (
              <div className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.28)] px-3 py-2">
                <p className="text-[11px] font-bold uppercase text-eb-text/50">
                  {t("incomeInsightTitle")}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-eb-text/80 tabular-nums">
                  {incomeInsight}
                </p>
              </div>
            ) : null
          }
          onAction={onOpenIncomeEditor}
          onSecondaryAction={onOpenFullIncomeEditor}
        />
        <OpenMonthPillarCard
          title={t("expensesTitle")}
          amount={fmt(summary.totalExpenditure)}
          description={
            summary.pillarDescriptions.expenditure || t("expensesHint")
          }
          icon={<ReceiptText className="h-5 w-5" />}
          actionLabel={t("quickAdjustExpenses")}
          secondaryActionLabel={t("editAllExpenses")}
          actionState="available"
          stateLabel={t("availableNow")}
          insight={
            subscriptionInsight ? (
              <div className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.28)] px-3 py-2">
                <p className="text-[11px] font-bold uppercase text-eb-text/50">
                  {t("subscriptionInsightTitle")}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-eb-text/80 tabular-nums">
                  {subscriptionInsight}
                </p>
              </div>
            ) : null
          }
          onAction={onOpenPeriodEditor}
          onSecondaryAction={onOpenFullExpenseEditor}
        />
        <OpenMonthPillarCard
          title={t("savingsTitle")}
          amount={fmt(summary.totalSavings)}
          description={summary.pillarDescriptions.savings || t("savingsHint")}
          icon={<PiggyBank className="h-5 w-5" />}
          actionLabel={t("manageSavings")}
          actionState="available"
          stateLabel={t("availableNow")}
          onAction={onOpenFullSavingsEditor}
        />
        <OpenMonthPillarCard
          title={t("debtsTitle")}
          amount={fmt(summary.totalDebtPayments)}
          description={summary.pillarDescriptions.debts || t("debtsHint")}
          icon={<CreditCard className="h-5 w-5" />}
          actionState="coming-soon"
          stateLabel={comingSoon}
        />
      </div>
    </section>
  );
};

export default OpenMonthPillarsGrid;
