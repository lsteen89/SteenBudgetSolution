import { clsx } from "clsx";
import { ShieldCheck, Sparkles, TrendingUp, Zap } from "lucide-react";
import React, { useMemo } from "react";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { tDict } from "@/utils/i18n/translate";
import { savingsMilestoneCardDict } from "@/utils/i18n/wizard/stepSavings/SavingsMilestoneCard.i18n";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import {
  calculateBoost,
  formatDuration,
  monthsToTarget,
} from "@/utils/budget/savingCalculations";
import { renderEmphasis } from "@/utils/ui/renderEmphasis";

type Props = {
  monthlySavings?: number | null;
  monthlyIncome?: number | null;
  targetAmount?: number;
  deltaAmount?: number;
};

export default function SavingsMilestoneCard({
  monthlySavings,
  monthlyIncome,
  targetAmount = 1_000_000,
  deltaAmount = 1_000,
}: Props) {
  const locale = useAppLocale();
  const currency = useAppCurrency();

  const t = <K extends keyof typeof savingsMilestoneCardDict.sv>(k: K) =>
    tDict(k, locale, savingsMilestoneCardDict);

  const savings = Number.isFinite(Number(monthlySavings))
    ? Number(monthlySavings)
    : 0;

  const income = Number.isFinite(Number(monthlyIncome))
    ? Number(monthlyIncome)
    : 0;

  const money0 = React.useCallback(
    (n: number) => formatMoneyV2(n, currency, locale, { fractionDigits: 0 }),
    [currency, locale],
  );

  const months = useMemo(
    () => monthsToTarget(savings, targetAmount),
    [savings, targetAmount],
  );

  const timeString = useMemo(
    () => formatDuration(months, locale),
    [months, locale],
  );

  const monthsSaved = useMemo(
    () => calculateBoost(savings, targetAmount, deltaAmount),
    [savings, targetAmount, deltaAmount],
  );

  const rate = useMemo(() => {
    if (income <= 0 || savings <= 0) return null;
    return savings / income;
  }, [income, savings]);

  const rateLabel =
    rate === null
      ? null
      : rate < 0.1
        ? t("rateBuffer")
        : rate < 0.2
          ? t("rateStable")
          : t("rateAggressive");

  if (savings <= 0) return null;

  const summaryText = t("summaryTemplate")
    .replace("{amount}", money0(savings))
    .replace("{time}", timeString);

  const boostText = t("boostTemplate")
    .replace("{delta}", money0(deltaAmount))
    .replace("{months}", String(monthsSaved));

  const help = renderEmphasis(t("helpText"));

  return (
    <div
      className={clsx(
        "mt-6 rounded-2xl p-4 relative overflow-hidden",
        "bg-white/[0.55] backdrop-blur-[6px]",
        "border border-wizard-stroke/60",
        "shadow-[0_16px_40px_rgba(2,6,23,0.12)]",
        "ring-1 ring-white/40",
      )}
    >
      <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-wizard-shell2/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-darkLimeGreen/20 blur-3xl" />

      <div className="flex items-center gap-3 mb-2 relative">
        <div
          className={clsx(
            "p-2 rounded-xl border",
            "bg-darkLimeGreen/15 border-darkLimeGreen/25",
            "shadow-[0_10px_25px_rgba(2,6,23,0.10)]",
          )}
        >
          <TrendingUp className="w-4 h-4 text-darkLimeGreen" />
        </div>

        <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
          <h4 className="text-sm font-semibold text-wizard-text truncate">
            {t("milestoneLabel")}{" "}
            <span className="text-darkLimeGreen">{t("milestoneValue")}</span>
          </h4>

          {rateLabel && (
            <span
              className={clsx(
                "shrink-0 text-[11px] px-2 py-1 rounded-full",
                "bg-white/60 border border-wizard-stroke/60",
                "text-wizard-text/70",
              )}
            >
              {rateLabel} · {Math.round((rate ?? 0) * 100)}%
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-wizard-text/70 leading-relaxed relative">
        {summaryText}
      </p>

      {!!monthsSaved && monthsSaved > 0 && (
        <div
          className={clsx(
            "mt-3 pt-3 border-t",
            "border-wizard-stroke/50",
            "flex items-center gap-2 text-[11px]",
            "text-wizard-text/70 relative",
          )}
        >
          <div className="p-1 rounded-md bg-wizard-shell2/20 border border-wizard-stroke/50">
            <Zap className="w-3 h-3 text-wizard-shell3" />
          </div>
          <span>{boostText}</span>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-wizard-stroke/50 flex flex-col gap-2 relative">
        <div className="flex items-center gap-2 text-[10px] text-wizard-text/50 uppercase tracking-widest">
          <div className="p-1 rounded-md bg-amber-500/15 border border-amber-500/20">
            <Sparkles className="w-3 h-3 text-amber-600" />
          </div>
          <span>{t("comingAnalysis")}</span>
        </div>

        <p className="text-[11px] text-wizard-text/60 italic leading-snug">
          {help}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-wizard-text/55 relative">
        <ShieldCheck className="w-3 h-3 text-wizard-text/45" />
        <span>{t("disclaimer")}</span>
      </div>
    </div>
  );
}
