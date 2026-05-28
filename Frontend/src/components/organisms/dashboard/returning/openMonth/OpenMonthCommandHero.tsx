import { ArrowRight, CalendarClock } from "lucide-react";
import React from "react";

import { CtaLink } from "@/components/atoms/buttons/CtaLink";
import type { CloseAvailability } from "@/hooks/dashboard/getCloseAvailabilityLabel";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { appRoutes } from "@/routes/appRoutes";
import { openMonthCommandCenterDict } from "@/utils/i18n/pages/private/dashboard/openMonth/OpenMonthCommandCenter.i18n";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2, moneyDecimalsFor } from "@/utils/money/moneyV2";

type Props = {
  periodLabel: string;
  finalBalance: number;
  currency: CurrencyCode;
  closeAvailability: CloseAvailability;
};

const OpenMonthCommandHero: React.FC<Props> = ({
  periodLabel,
  finalBalance,
  currency,
  closeAvailability,
}) => {
  const locale = useAppLocale();
  const t = <K extends keyof typeof openMonthCommandCenterDict.sv>(key: K) =>
    tDict(key, locale, openMonthCommandCenterDict);

  const isNegative = finalBalance < 0;
  const isNeutral = finalBalance === 0;
  // Match the savings module's `moneyDecimalsFor` policy so the hero
  // amount renders byte-identical to the savings page's Kvar value
  // (whole-krona → no trailing zeros; real cents → 2 decimals). Keeps the
  // dashboard ↔ savings parity smoke spec honest at the character level.
  const moneyAmount = Math.abs(finalBalance);
  const moneyLabel = formatMoneyV2(moneyAmount, currency, locale, {
    fractionDigits: moneyDecimalsFor(moneyAmount),
  });
  const title = isNegative
    ? t("heroTitleNegative")
    : isNeutral
      ? t("heroTitleNeutral")
      : t("heroTitlePositive");
  const closeLabel =
    closeAvailability.kind === "ready"
      ? t("closeReady")
      : closeAvailability.kind === "countdown"
        ? closeAvailability.label
        : t("closeUnavailable");

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[2rem] border border-eb-stroke/30 bg-eb-surface px-5 py-5 shadow-[0_18px_45px_rgba(21,39,81,0.10)] sm:px-6 sm:py-6",
        isNegative && "border-red-400/25",
      )}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-eb-stroke/30 bg-[rgb(var(--eb-shell)/0.45)] px-3 py-1 text-xs font-semibold text-eb-text/70">
              {t("heroEyebrow")}
            </span>
            <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
              {t("heroStatusOpen")}
            </span>
          </div>

          <div>
            <p className="text-sm font-semibold text-eb-text/60">
              {periodLabel}
            </p>
            <h1 className="mt-1 max-w-3xl text-2xl font-extrabold tracking-tight text-eb-text sm:text-3xl">
              {title}
            </h1>
          </div>

          <div>
            <p className="text-xs font-medium text-eb-text/50">
              {t("remainingLabel")}
            </p>
            <p
              data-testid="dashboard-pengalage-amount"
              className={cn(
                "mt-1 text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl",
                isNegative ? "text-red-500" : "text-eb-text",
              )}
            >
              {isNegative ? "-" : ""}
              {moneyLabel}
            </p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-eb-text/65">
              {isNegative ? t("remainingNegative") : t("remainingPositive")}
            </p>
          </div>
        </div>

        <div className="w-full shrink-0 rounded-3xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.35)] p-4 lg:w-72">
          <div className="mb-3 flex items-start gap-2 text-sm font-semibold text-eb-text">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-eb-accent" />
            <div>
              <p>{closeLabel}</p>
            </div>
          </div>

          <CtaLink
            to={appRoutes.dashboardBreakdown}
            className="h-12 w-full justify-center rounded-2xl px-4"
          >
            <span>{t("primaryAction")}</span>
            <ArrowRight className="h-4 w-4" />
          </CtaLink>
          <p className="mt-2 text-xs leading-5 text-eb-text/55">
            {t("primaryActionHint")}
          </p>
        </div>
      </div>
    </section>
  );
};

export default OpenMonthCommandHero;
