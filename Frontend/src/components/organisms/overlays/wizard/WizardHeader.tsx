import logo from "@/assets/Images/eBudgetLogo.png";
import { WizardMascot } from "@/components/atoms/animation/WizardMascot";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { tDict } from "@/utils/i18n/translate";
import { X } from "lucide-react";
import React from "react";

type WizardHeaderProps = {
  step: number;
  onClose: () => void;
  showBrand?: boolean;
  brandSize?: number;
  rightSlot?: React.ReactNode;
};

// ✅ flat dict ONLY (compatible with tDict)
const headerUiDict = {
  sv: {
    closeTitle: "Stäng guiden",
    closeAria: "Stäng guide",
  },
  en: {
    closeTitle: "Close wizard",
    closeAria: "Close wizard",
  },
  et: {
    closeTitle: "Sulge juhend",
    closeAria: "Sulge juhend",
  },
} as const;

const headerStepTitles: Record<"sv" | "en" | "et", Record<number, string>> = {
  sv: {
    0: "",
    1: "Din inkomst",
    2: "Dina utgifter",
    3: "Ditt sparande",
    4: "Dina skulder",
    5: "Slutför",
  },
  en: {
    0: "",
    1: "Your income",
    2: "Your expenses",
    3: "Your savings",
    4: "Your debts",
    5: "Finish",
  },
  et: {
    0: "",
    1: "Sinu sissetulek",
    2: "Sinu kulud",
    3: "Sinu säästud",
    4: "Sinu võlad",
    5: "Lõpeta",
  },
} as const satisfies Record<"sv" | "en" | "et", Record<number, string>>;

const WizardHeaderComponent = ({
  step,
  onClose,
  showBrand = step !== 0,
  brandSize = 52,
  rightSlot,
}: WizardHeaderProps) => {
  const locale = useAppLocale();
  const t = <K extends keyof typeof headerUiDict.sv>(k: K) =>
    tDict(k, locale, headerUiDict);

  const dictLocale: keyof typeof headerStepTitles = locale.startsWith("sv")
    ? "sv"
    : locale.startsWith("et")
      ? "et"
      : "en";

  const title =
    headerStepTitles[dictLocale][step] ?? headerStepTitles[dictLocale][5];
  const isWelcomeStep = step === 0;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center px-2",
        isWelcomeStep ? "mb-2 h-10 md:mb-3 md:h-11" : "mb-4 h-12",
      )}
    >
      {showBrand && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
          <WizardMascot src={logo} size={brandSize} showText={false} />
        </div>
      )}

      <h2 className="text-lg md:text-xl font-semibold text-wizard-text/80">
        {title}
      </h2>

      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-3">
        {rightSlot}

        <button
          type="button"
          onClick={onClose}
          title={t("closeTitle")}
          aria-label={t("closeAria")}
          className={cn(
            "relative h-9 w-9 rounded-full",
            "bg-wizard-surface/70 hover:bg-wizard-surface",
            "border border-wizard-stroke/40",
            "flex items-center justify-center",
            "text-wizard-warning/80 hover:text-wizard-warning",
            "transition",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-accent/25",
            "before:absolute before:inset-[-10px] before:content-['']",
          )}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export const WizardHeader = React.memo(WizardHeaderComponent);
