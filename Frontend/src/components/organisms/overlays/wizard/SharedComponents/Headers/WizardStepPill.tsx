import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { tDict } from "@/utils/i18n/translate";
import React from "react";

const wizardStepPillDict = {
  sv: {
    step: "Steg",
  },
  en: {
    step: "Step",
  },
  et: {
    step: "Samm",
  },
} as const;

type Props = {
  stepNumber?: number;
  majorLabel: string;
  subLabel?: string;
  align?: "center" | "left";
  className?: string;
};

export const WizardStepPill: React.FC<Props> = ({
  stepNumber,
  majorLabel,
  subLabel,
  align = "center",
  className,
}) => {
  const locale = useAppLocale();

  const t = <K extends keyof typeof wizardStepPillDict.sv>(k: K) =>
    tDict(k, locale, wizardStepPillDict);

  return (
    <div
      className={cn(
        align === "center" ? "flex justify-center" : "flex justify-start",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full",
          "bg-wizard-surface border border-wizard-stroke/20",
          "px-4 py-1.5 text-[13px] font-semibold",
          "text-wizard-text/75 shadow-sm shadow-black/5",
          className,
        )}
      >
        {typeof stepNumber === "number" ? (
          <>
            <span className="text-wizard-accent">
              {t("step")} {stepNumber}
            </span>
            <span className="text-wizard-text/35">•</span>
          </>
        ) : null}

        <span className="text-wizard-text">{majorLabel}</span>

        {subLabel ? (
          <>
            <span className="text-wizard-text/35">•</span>
            <span className="text-wizard-text/70">{subLabel}</span>
          </>
        ) : null}
      </span>
    </div>
  );
};
