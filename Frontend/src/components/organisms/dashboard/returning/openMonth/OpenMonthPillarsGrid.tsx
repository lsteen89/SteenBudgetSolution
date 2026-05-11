import {
  Banknote,
  CreditCard,
  PiggyBank,
  ReceiptText,
} from "lucide-react";
import React from "react";

import type { DashboardSummary } from "@/hooks/dashboard/dashboardSummary.types";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { openMonthCommandCenterDict } from "@/utils/i18n/pages/private/dashboard/openMonth/OpenMonthCommandCenter.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import OpenMonthPillarCard from "./OpenMonthPillarCard";

type Props = {
  summary: DashboardSummary;
  onOpenPeriodEditor: () => void;
};

const OpenMonthPillarsGrid: React.FC<Props> = ({
  summary,
  onOpenPeriodEditor,
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

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold text-eb-text">{t("pillarsTitle")}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <OpenMonthPillarCard
          title={t("incomeTitle")}
          amount={fmt(summary.totalIncome)}
          description={summary.pillarDescriptions.income || t("incomeHint")}
          icon={<Banknote className="h-5 w-5" />}
          actionState="coming-soon"
          stateLabel={comingSoon}
        />
        <OpenMonthPillarCard
          title={t("expensesTitle")}
          amount={fmt(summary.totalExpenditure)}
          description={
            summary.pillarDescriptions.expenditure || t("expensesHint")
          }
          icon={<ReceiptText className="h-5 w-5" />}
          actionLabel={t("adjustExpenses")}
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
        />
        <OpenMonthPillarCard
          title={t("savingsTitle")}
          amount={fmt(summary.totalSavings)}
          description={summary.pillarDescriptions.savings || t("savingsHint")}
          icon={<PiggyBank className="h-5 w-5" />}
          actionState="coming-soon"
          stateLabel={comingSoon}
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
