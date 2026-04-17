import { ArrowRight } from "lucide-react";
import React from "react";

import Mascot from "@/components/atoms/animation/Mascot";
import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { SecondaryButton } from "@/components/atoms/buttons/SecondaryButton";

import WrenchBird from "@/assets/Images/WrenchBird.png";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { editPeriodCardDict } from "@/utils/i18n/pages/private/dashboard/cards/period/EditPeriodCard.i18n";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

type EditPeriodCardProps = {
  periodLabel: string;
  remainingToSpend: number;
  currency?: CurrencyCode;
  onOpenPeriodEditor: () => void;
};

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
};

const EditPeriodCard: React.FC<EditPeriodCardProps> = ({
  periodLabel,
  remainingToSpend,
  currency,
  onOpenPeriodEditor,
}) => {
  const locale = useAppLocale();
  const appCurrency = useAppCurrency();

  const t = <K extends keyof typeof editPeriodCardDict.sv>(key: K) =>
    tDict(key, locale, editPeriodCardDict);

  const isNegative = remainingToSpend < 0;
  const absRemaining = Math.abs(remainingToSpend);
  const effectiveCurrency = currency ?? appCurrency;
  const formattedAmount = formatMoneyV2(
    absRemaining,
    effectiveCurrency,
    locale,
  );

  const title = isNegative ? t("titleNegative") : t("titlePositive");

  const description = isNegative
    ? interpolate(t("descriptionNegative"), {
        amount: formattedAmount,
        periodLabel,
      })
    : interpolate(t("descriptionPositive"), {
        periodLabel,
      });

  const buttonLabel = isNegative ? t("buttonNegative") : t("buttonPositive");
  const ActionButton = isNegative ? CtaButton : SecondaryButton;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border bg-eb-surface p-5 shadow-[0_10px_30px_rgba(21,39,81,0.08)]",
        isNegative ? "border-red-400/20" : "border-eb-stroke/30",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-28",
          isNegative
            ? "bg-gradient-to-b from-red-500/10 to-transparent"
            : "bg-gradient-to-b from-[rgb(var(--eb-shell)/0.95)] to-transparent",
        )}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {isNegative && (
            <span className="inline-flex items-center rounded-full border border-red-400/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-600">
              {t("needsAttention")}
            </span>
          )}

          <div className="mt-3 space-y-2">
            <h3 className="text-lg font-extrabold tracking-tight text-eb-text">
              {title}
            </h3>

            <p className="max-w-[34ch] text-sm leading-6 text-eb-text/70">
              {description}
            </p>
          </div>
        </div>

        <Mascot
          src={WrenchBird}
          alt={t("mascotAlt")}
          size={88}
          smSize={96}
          mdSize={108}
          float
          shadow={false}
          className="shrink-0 -mr-1 -mt-1"
          imgClassName={cn(
            "drop-shadow-[0_10px_20px_rgba(21,39,81,0.10)]",
            isNegative ? "rotate-[-3deg]" : "rotate-[2deg]",
          )}
        />
      </div>

      <div className="relative mt-5">
        <ActionButton
          onClick={onOpenPeriodEditor}
          className="h-11 w-full justify-center rounded-2xl px-4"
        >
          <span>{buttonLabel}</span>
          <ArrowRight className="h-4 w-4" />
        </ActionButton>
      </div>
    </section>
  );
};

export default EditPeriodCard;
