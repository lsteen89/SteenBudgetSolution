import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ListChecks,
} from "lucide-react";
import React from "react";

import type { DashboardSummary } from "@/hooks/dashboard/dashboardSummary.types";
import type { CloseAvailability } from "@/hooks/dashboard/getCloseAvailabilityLabel";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { AppLocale } from "@/types/i18n/appLocale";
import { openMonthCommandCenterDict } from "@/utils/i18n/pages/private/dashboard/openMonth/OpenMonthCommandCenter.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

type FollowUpTone = "attention" | "neutral" | "positive";

type FollowUpItem = {
  id: string;
  title: string;
  body: string;
  tone: FollowUpTone;
};

type Props = {
  summary: DashboardSummary;
  closeAvailability: CloseAvailability;
};

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

function buildOpenMonthFollowUps(
  summary: DashboardSummary,
  closeAvailability: CloseAvailability,
  locale: AppLocale,
): FollowUpItem[] {
  const t = <K extends keyof typeof openMonthCommandCenterDict.sv>(key: K) =>
    tDict(key, locale, openMonthCommandCenterDict);
  const items: FollowUpItem[] = [];
  const formatAmount = (amount: number) =>
    formatMoneyV2(amount, summary.currency, locale);

  if (summary.header.lifecycleState === "overdue") {
    items.push({
      id: "overdue",
      title: t("followUpOverdueTitle"),
      body: t("followUpOverdueBody"),
      tone: "attention",
    });
  } else if (closeAvailability.kind === "countdown") {
    items.push({
      id: "close-countdown",
      title: t("followUpCloseCountdownTitle"),
      body: interpolate(t("followUpCloseCountdownBody"), {
        label: closeAvailability.label,
      }),
      tone: "neutral",
    });
  }

  if (summary.finalBalance < 0) {
    items.push({
      id: "negative-final-balance",
      title: t("followUpNegativeTitle"),
      body: t("followUpNegativeBody"),
      tone: "attention",
    });
  } else if (
    summary.finalBalance > 0 &&
    summary.totalIncome > 0 &&
    summary.finalBalance / summary.totalIncome >= 0.15
  ) {
    items.push({
      id: "large-surplus",
      title: t("followUpSurplusTitle"),
      body: interpolate(t("followUpSurplusBody"), {
        amount: formatAmount(summary.finalBalance),
      }),
      tone: "positive",
    });
  }

  if (summary.subscriptionsTotal > 0) {
    items.push({
      id: "subscriptions",
      title: t("followUpSubscriptionsTitle"),
      body: interpolate(t("followUpSubscriptionsBody"), {
        amount: formatAmount(summary.subscriptionsTotal),
      }),
      tone: "neutral",
    });
  }

  if (summary.totalSavings <= 0 && summary.totalIncome > 0) {
    items.push({
      id: "savings-low",
      title: t("followUpSavingsLowTitle"),
      body: t("followUpSavingsLowBody"),
      tone: "neutral",
    });
  }

  if (summary.totalDebtPayments > 0) {
    items.push({
      id: "debt-payments",
      title: t("followUpDebtTitle"),
      body: interpolate(t("followUpDebtBody"), {
        amount: formatAmount(summary.totalDebtPayments),
      }),
      tone: "neutral",
    });
  }

  if (summary.recurringExpenses.length > 0) {
    items.push({
      id: "recurring-expenses",
      title: t("followUpRecurringTitle"),
      body: interpolate(t("followUpRecurringBody"), {
        count: summary.recurringExpenses.length,
      }),
      tone: "neutral",
    });
  }

  return items.slice(0, 3);
}

function FollowUpIcon({ tone }: { tone: FollowUpTone }) {
  if (tone === "attention") return <AlertCircle className="h-4 w-4" />;
  if (tone === "positive") return <CheckCircle2 className="h-4 w-4" />;
  return <CalendarClock className="h-4 w-4" />;
}

const OpenMonthFollowUpStrip: React.FC<Props> = ({
  summary,
  closeAvailability,
}) => {
  const locale = useAppLocale();
  const t = <K extends keyof typeof openMonthCommandCenterDict.sv>(key: K) =>
    tDict(key, locale, openMonthCommandCenterDict);
  const followUps = buildOpenMonthFollowUps(summary, closeAvailability, locale);

  return (
    <section className="rounded-3xl border border-eb-stroke/25 bg-white/80 px-5 py-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-eb-accent" />
        <h2 className="text-sm font-bold text-eb-text">
          {t("followUpTitle")}
        </h2>
      </div>

      {followUps.length === 0 ? (
        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-eb-text">
            {t("followUpEmptyTitle")}
          </p>
          <p className="mt-1 text-sm text-eb-text/65">
            {t("followUpEmptyBody")}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {followUps.map((item) => (
            <article
              key={item.id}
              className={cn(
                "rounded-2xl border px-4 py-3",
                item.tone === "attention"
                  ? "border-red-400/20 bg-red-50/80"
                  : item.tone === "positive"
                    ? "border-emerald-500/15 bg-emerald-50/80"
                    : "border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.28)]",
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-2 text-sm font-bold",
                  item.tone === "attention"
                    ? "text-red-700"
                    : item.tone === "positive"
                      ? "text-emerald-700"
                      : "text-eb-text",
                )}
              >
                <FollowUpIcon tone={item.tone} />
                {item.title}
              </div>
              <p className="mt-1 text-sm leading-5 text-eb-text/65 tabular-nums">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default OpenMonthFollowUpStrip;
