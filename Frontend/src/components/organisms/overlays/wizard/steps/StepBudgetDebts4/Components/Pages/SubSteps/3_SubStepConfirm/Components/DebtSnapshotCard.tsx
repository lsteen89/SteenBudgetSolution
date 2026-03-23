import { Wallet } from "lucide-react";

import WizardCard from "@/components/organisms/overlays/wizard/SharedComponents/Cards/WizardCard";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { tDict } from "@/utils/i18n/translate";
import { debtSnapshotCardDict } from "@/utils/i18n/wizard/stepDebt/DebtSnapshotCard.i18n";

function aprTone(
  apr: number,
  t: <K extends keyof typeof debtSnapshotCardDict.sv>(k: K) => string,
) {
  if (apr >= 18) {
    return {
      label: t("aprHigh"),
      cls: cn(
        "text-wizard-warning",
        "bg-wizard-warning/10",
        "border-wizard-warning/25",
      ),
    };
  }

  if (apr >= 8) {
    return {
      label: t("aprMedium"),
      cls: cn(
        "text-wizard-text/75",
        "bg-wizard-surface-accent/55",
        "border-wizard-stroke/25",
      ),
    };
  }

  return {
    label: t("aprLow"),
    cls: cn(
      "text-wizard-text/70",
      "bg-wizard-surface-accent/50",
      "border-wizard-stroke/20",
    ),
  };
}

export default function DebtSnapshotCard({
  totalBalance,
  avgApr,
  money0,
}: {
  totalBalance: number;
  avgApr: number;
  money0: (v: number) => string;
}) {
  const locale = useAppLocale();

  const t = <K extends keyof typeof debtSnapshotCardDict.sv>(k: K) =>
    tDict(k, locale, debtSnapshotCardDict);

  const tone = aprTone(avgApr, t);

  return (
    <WizardCard>
      <div className="relative">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-wizard-accent" />
          <h3 className="text-sm font-semibold text-wizard-text">
            {t("title")}
          </h3>
        </div>

        <div className="mt-3 h-px bg-wizard-stroke/20" />

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            className={cn(
              "rounded-2xl p-4",
              "bg-wizard-surface-accent/40",
              "border border-wizard-stroke/80",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
            )}
          >
            <p className="text-xs font-semibold text-wizard-text/55">
              {t("totalDebt")}
            </p>
            <p className="mt-1 font-mono text-lg font-extrabold text-wizard-text tabular-nums">
              {money0(totalBalance)}
            </p>
          </div>

          <div
            className={cn(
              "rounded-2xl p-4",
              "bg-wizard-surface-accent/40",
              "border border-wizard-stroke/80",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
            )}
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <p className="min-w-0 truncate text-xs font-semibold leading-none text-wizard-text/55">
                  {t("averageApr")}
                </p>
              </div>

              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 border",
                  "text-[11px] font-semibold leading-none",
                  tone.cls,
                )}
              >
                {tone.label}
              </span>
            </div>

            <p className="mt-1 font-mono text-lg font-extrabold text-wizard-text tabular-nums">
              {Number.isFinite(avgApr) ? avgApr.toFixed(1) : "—"}
              <span className="ml-0.5 text-sm font-semibold text-wizard-text/55">
                %
              </span>
            </p>
          </div>
        </div>
      </div>
    </WizardCard>
  );
}
