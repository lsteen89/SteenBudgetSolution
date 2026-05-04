import { Lock, Sparkles } from "lucide-react";
import React from "react";

import type { BudgetPeriodStatus } from "@/hooks/dashboard/dashboardSummary.types";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { dashboardHeaderDict } from "@/utils/i18n/pages/private/dashboard/header/DashboardHeader.i18n";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

type HeaderTKey = keyof typeof dashboardHeaderDict.sv;
type HeaderT = <K extends HeaderTKey>(key: K) => string;

export type ReturningHeaderProps = {
  periodLabel: string;
  periodDateRangeLabel: string;
  periodStatus: BudgetPeriodStatus;

  remainingToSpend: number;
  currency?: CurrencyCode;
};

function getHeaderTitle(
  periodLabel: string,
  periodStatus: BudgetPeriodStatus,
  remainingToSpend: number,
  t: HeaderT,
) {
  if (periodStatus === "closed") return periodLabel;
  if (remainingToSpend < 0) return t("titleNegative");
  if (remainingToSpend > 0) return t("titlePositive");
  return periodLabel;
}

function HeaderMetaPill({
  periodStatus,
  displayedPeriodRangeLabel,
  t,
}: {
  periodStatus: BudgetPeriodStatus;
  displayedPeriodRangeLabel: string;
  t: HeaderT;
}) {
  if (periodStatus === "open") {
    return (
      <div className="inline-flex h-11 items-center justify-center rounded-2xl border border-eb-stroke/25 bg-eb-surface/70 px-5 text-sm font-medium text-eb-text/60">
        {displayedPeriodRangeLabel}
      </div>
    );
  }

  return (
    <div className="inline-flex h-11 items-center justify-center rounded-2xl border border-eb-stroke/25 bg-eb-surface/70 px-5 text-sm font-medium text-eb-text/60">
      <Lock className="mr-2 h-4 w-4" />
      {t("closedReadOnly")}
    </div>
  );
}

const ReturningHeader: React.FC<ReturningHeaderProps> = ({
  periodLabel,
  periodDateRangeLabel,
  periodStatus,
  remainingToSpend,
  currency,
}) => {
  const locale = useAppLocale();
  const appCurrency = useAppCurrency();

  const displayedPeriodRangeLabel = periodDateRangeLabel || periodLabel;

  const t: HeaderT = (key) => tDict(key, locale, dashboardHeaderDict);

  const effectiveCurrency = currency ?? appCurrency;

  const remainingLabel = formatMoneyV2(
    remainingToSpend,
    effectiveCurrency,
    locale,
  );

  const negativeRemainingLabel = formatMoneyV2(
    Math.abs(remainingToSpend),
    effectiveCurrency,
    locale,
  );

  const remainingToneClass =
    remainingToSpend < 0 ? "text-red-500" : "text-eb-text";

  const title = getHeaderTitle(periodLabel, periodStatus, remainingToSpend, t);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-eb-text/70">
          <Sparkles className="h-4 w-4 text-eb-accent" />
          {t("topHint")}
        </div>

        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-eb-text sm:text-3xl">
          {title}
        </h1>

        <div className="mt-2 inline-flex items-center rounded-full border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.35)] px-3 py-1 text-xs font-semibold text-eb-text/65 sm:text-sm">
          {displayedPeriodRangeLabel}
        </div>

        <p className="mt-2 text-sm text-eb-text/65 sm:text-base">
          {remainingToSpend < 0 ? (
            <>
              {t("remainingNegativePrefix")}{" "}
              <span
                className={cn(
                  "font-extrabold tracking-tight",
                  remainingToneClass,
                )}
              >
                {negativeRemainingLabel}
              </span>{" "}
              {t("remainingNegativeSuffix")}
            </>
          ) : (
            <>
              {t("remainingPrefix")}{" "}
              <span
                className={cn(
                  "font-extrabold tracking-tight",
                  remainingToneClass,
                )}
              >
                {remainingLabel}
              </span>{" "}
              {t("remainingSuffix")}
            </>
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <HeaderMetaPill
          periodStatus={periodStatus}
          displayedPeriodRangeLabel={displayedPeriodRangeLabel}
          t={t}
        />
      </div>
    </div>
  );
};

export default ReturningHeader;
