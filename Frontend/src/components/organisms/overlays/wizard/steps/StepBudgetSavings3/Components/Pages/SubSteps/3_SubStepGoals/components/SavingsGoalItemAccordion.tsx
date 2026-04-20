import { Info, Star, Trash2 } from "lucide-react";
import React from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { WizardAccordion } from "@/components/organisms/overlays/wizard/SharedComponents/Accordion/WizardAccordion";
import type { Step3FormValues } from "@/types/Wizard/Step3_Savings/Step3FormValues";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import {
  calcProgress,
  calculateMonthlyContribution,
} from "@/utils/budget/financialCalculations";
import { tDict } from "@/utils/i18n/translate";
import { savingsGoalItemAccordionDict } from "@/utils/i18n/wizard/stepSavings/SavingsGoalItemAccordion.i18n";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import { cn } from "@/lib/utils";
import SavingsGoalItemRow from "./SavingsGoalItemRow";

type Props = {
  index: number;
  isFavorite: boolean;
  onFavoriteClick: (index: number) => void;
  onRemove: (index: number) => void;
  mobileTotal?: "hidden" | "inline" | "below";
};

function safeNum(n: unknown): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

export default function SavingsGoalItemAccordion({
  index,
  isFavorite,
  onFavoriteClick,
  onRemove,
  mobileTotal = "inline",
}: Props) {
  const { control } = useFormContext<Step3FormValues>();
  const currency = useAppCurrency();
  const locale = useAppLocale();

  const t = <K extends keyof typeof savingsGoalItemAccordionDict.sv>(k: K) =>
    tDict(k, locale, savingsGoalItemAccordionDict);

  const money0 = React.useMemo(
    () => (n: number) =>
      formatMoneyV2(n, currency, locale, { fractionDigits: 0 }),
    [currency, locale],
  );

  const base = `goals.${index}` as const;
  const goal = useWatch({ control, name: base });

  const fallbackName = t("fallbackGoalName").replace(
    "{index}",
    String(index + 1),
  );

  const name = goal?.name?.trim() || fallbackName;
  const targetAmount = safeNum(goal?.targetAmount);
  const amountSaved = safeNum(goal?.amountSaved);

  const rawDate = goal?.targetDate ?? null;
  const date = rawDate ? new Date(String(rawDate).split("T")[0]) : null;
  const validDate = date && !Number.isNaN(date.getTime()) ? date : null;

  const monthly = calculateMonthlyContribution(
    targetAmount > 0 ? targetAmount : null,
    amountSaved > 0 ? amountSaved : null,
    validDate,
  );

  const progress = calcProgress(
    targetAmount > 0 ? targetAmount : null,
    amountSaved > 0 ? amountSaved : null,
  );

  const incomplete = !goal?.name || !targetAmount || !goal?.targetDate;

  const totalText =
    typeof monthly === "number" && Number.isFinite(monthly) && monthly > 0
      ? money0(monthly)
      : "—";

  const title = (
    <div className="min-w-0 pr-1 sm:pr-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 truncate text-[15px] font-semibold text-wizard-text sm:text-base">
          {name}
        </span>

        {incomplete ? (
          <>
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full bg-wizard-warning sm:hidden"
            />
            <span
              className={cn(
                "hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline-flex",
                "border border-wizard-warning/25 bg-wizard-warning/10 text-wizard-warning",
              )}
            >
              {t("missingInfo")}
            </span>
          </>
        ) : null}
      </div>

      <div className="mt-1 hidden text-xs text-wizard-text/65 sm:block">
        {t("targetLabel")}:{" "}
        <span className="tabular-nums font-semibold text-wizard-text/80">
          {money0(targetAmount)}
        </span>
        <span className="text-wizard-text/35"> • </span>
        {t("savedLabel")}:{" "}
        <span className="tabular-nums font-semibold text-wizard-text/80">
          {money0(amountSaved)}
        </span>
        <span className="text-wizard-text/35"> • </span>
        {t("completeLabel")}:{" "}
        <span className="tabular-nums font-semibold text-wizard-text/80">
          {progress}%
        </span>
      </div>
    </div>
  );

  return (
    <WizardAccordion
      value={String(index)}
      title={title}
      subtitle={undefined}
      totalText={totalText}
      totalSuffix={t("mobilePerMonthSuffix")}
      mobileTotal={mobileTotal}
      variant="shell"
      actions={
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            aria-label={
              isFavorite ? t("favoriteSelectedAria") : t("markFavoriteAria")
            }
            aria-pressed={isFavorite}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFavoriteClick(index);
            }}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-lg",
              "border shadow-sm shadow-black/5",
              "transition-colors select-none",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-stroke/45",
              isFavorite
                ? "border-amber-400/50 bg-amber-400/15 text-amber-600"
                : cn(
                    "bg-wizard-surface border-wizard-stroke/20 text-wizard-text/60",
                    "hover:border-amber-400/35 hover:bg-amber-400/10 hover:text-amber-600",
                  ),
            )}
          >
            <Star
              size={14}
              className={cn(isFavorite ? "fill-current" : "fill-transparent")}
            />
          </button>

          <button
            type="button"
            aria-label={t("removeGoalAria")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove(index);
            }}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-lg",
              "bg-wizard-surface border border-wizard-stroke/20",
              "text-wizard-text/60 shadow-sm shadow-black/5",
              "transition-colors cursor-pointer select-none",
              "hover:border-wizard-warning/30 hover:bg-wizard-warning/10 hover:text-wizard-warning",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-stroke/45",
            )}
          >
            <Trash2 size={14} />
          </button>
        </div>
      }
    >
      <SavingsGoalItemRow index={index} />

      <div className="mt-4 flex items-center gap-2 text-xs text-wizard-text/65">
        <Info size={14} className="shrink-0 text-wizard-text/45" />
        <span>{t("helpText")}</span>
      </div>
    </WizardAccordion>
  );
}
