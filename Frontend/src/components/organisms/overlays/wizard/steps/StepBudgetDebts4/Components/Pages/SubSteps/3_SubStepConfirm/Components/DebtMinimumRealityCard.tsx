import WizardCard from "@/components/organisms/overlays/wizard/SharedComponents/Cards/WizardCard";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { tDict } from "@/utils/i18n/translate";
import { debtMinimumRealityCardDict } from "@/utils/i18n/wizard/stepDebt/DebtMinimumRealityCard.i18n";
import { ReceiptText } from "lucide-react";

export default function DebtMinimumRealityCard({
  monthly,
  money0,
}: {
  monthly: number;
  money0: (v: number) => string;
}) {
  const locale = useAppLocale();

  const t = <K extends keyof typeof debtMinimumRealityCardDict.sv>(k: K) =>
    tDict(k, locale, debtMinimumRealityCardDict);

  const hasValue = Number.isFinite(monthly) && monthly > 0;

  return (
    <WizardCard>
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-wizard-accent" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-wizard-text/55">
              {t("title")}
            </p>
          </div>

          <span className="text-xs text-wizard-text/45">{t("badge")}</span>
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-4">
          <p className="text-sm text-wizard-text/70">{t("totalMinimum")}</p>

          <p className="font-mono text-2xl font-extrabold tabular-nums">
            <span
              className={cn(
                hasValue ? "text-wizard-accent" : "text-wizard-text/60",
              )}
            >
              {hasValue ? money0(monthly) : "—"}
            </span>
            <span className="ml-2 text-sm font-semibold text-wizard-text/55">
              {t("perMonthSuffix")}
            </span>
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
              "bg-wizard-surface-accent/50 border border-wizard-stroke/20",
              "text-wizard-text/70",
            )}
          >
            {t("chipMinimum")}
          </span>

          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
              "bg-wizard-surface-accent/50 border border-wizard-stroke/20",
              "text-wizard-text/70",
            )}
          >
            {t("chipExtra")}
          </span>
        </div>

        <p className="mt-3 text-xs text-wizard-text/55">{t("footer")}</p>
      </div>
    </WizardCard>
  );
}
