import WizardCard from "@/components/organisms/overlays/wizard/SharedComponents/Cards/WizardCard";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import clsx from "clsx";
import React, { useCallback } from "react";
import VerdictChip from "../organisms/overlays/wizard/steps/StepBudgetFinal5/Components/Pages/SubSteps/1_SubStepFinal/components/VerdictChip";

interface FinalVerdictCardProps {
  balance: number;
  currency: CurrencyCode;
  kind: "good" | "tight" | "bad";
  title: string;
  detail?: string;
  money?: { fractionDigits?: 0 | 2 };
}

const DESCRIPTIONS: Record<"good" | "tight" | "bad", string> = {
  good: "Du går plus varje månad. Skapa budgeten — du kan finjustera efteråt.",
  tight:
    "Det går ihop, men marginalen är liten. Skapa budgeten och justera vid behov.",
  bad: "Du går minus varje månad. Skapa budgeten ändå — men vi markerar vad som bör justeras direkt.",
};

function tone(kind: "good" | "tight" | "bad") {
  if (kind === "bad") {
    return {
      amount: "text-wizard-warning",
      glow: "bg-wizard-warning/10",
      border: "border-wizard-warning/20",
    };
  }
  if (kind === "tight") {
    return {
      amount: "text-wizard-text",
      glow: "bg-wizard-surface-accent/55",
      border: "border-wizard-stroke/25",
    };
  }
  return {
    amount: "text-wizard-accent",
    glow: "bg-wizard-accent/10",
    border: "border-wizard-stroke/25",
  };
}

const FinalVerdictCard: React.FC<FinalVerdictCardProps> = ({
  balance,
  currency,
  kind,
  title,
  detail,
  money,
}) => {
  const locale = useAppLocale();
  const fractionDigits = money?.fractionDigits ?? 0;

  const moneyFmt = useCallback(
    (v: number) => formatMoneyV2(v ?? 0, currency, locale, { fractionDigits }),
    [currency, locale, fractionDigits],
  );

  const t = tone(kind);

  return (
    <WizardCard>
      {/* top row */}
      <div className="flex items-start gap-3">
        <VerdictChip kind={kind} title={title} />

        <div className="min-w-0">
          <p className="text-xs text-wizard-text/60 leading-relaxed">
            {detail ?? DESCRIPTIONS[kind]}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <h2 className="text-xs sm:text-sm font-semibold tracking-[0.22em] uppercase text-wizard-text/55">
          Ditt månadsresultat
        </h2>

        {/* amount */}
        <div className="relative mt-3">
          {/* soft glow behind amount */}
          <div
            aria-hidden
            className={clsx(
              "pointer-events-none absolute -inset-x-2 -inset-y-2 rounded-3xl blur-2xl",
              t.glow,
            )}
          />

          <p
            className={clsx(
              "relative tabular-nums font-extrabold tracking-tight",
              "text-3xl sm:text-4xl md:text-5xl",
              t.amount,
            )}
          >
            {moneyFmt(Math.abs(balance))}
          </p>

          {/* micro badge: plus/minus */}
          <div className="mt-2">
            <span
              className={clsx(
                "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
                "border bg-wizard-surface",
                t.border,
                "text-wizard-text/70",
              )}
            >
              {balance >= 0 ? "Överskott" : "Underskott"} per månad
            </span>
          </div>
        </div>

        <p className="mt-4 text-sm text-wizard-text/65">
          Kvar per månad efter utgifter, sparande och minimiskulder.
        </p>
      </div>
    </WizardCard>
  );
};

export default FinalVerdictCard;
