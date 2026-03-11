import logo from "@/assets/Images/eBudgetLogo.png";
import { WizardMascot } from "@/components/atoms/animation/WizardMascot";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import React from "react";
type WizardHeaderProps = {
  step: number;
  onClose: () => void;

  /** Hide/show the left brand logo (default: hidden on step 0) */
  showBrand?: boolean;

  /** Size in px forwarded to WizardLogo */
  brandSize?: number;

  rightSlot?: React.ReactNode;
};

const WizardHeaderComponent = ({
  step,
  onClose,
  showBrand = step !== 0,
  brandSize = 52, // bigger default
  rightSlot,
}: WizardHeaderProps) => {
  const title =
    step === 0
      ? ""
      : step === 1
        ? "Din inkomst"
        : step === 2
          ? "Dina utgifter"
          : step === 3
            ? "Ditt sparande"
            : step === 4
              ? "Dina skulder"
              : "Slutför";

  return (
    <div
      className={cn(
        "relative mb-4",
        "h-12",
        "px-2",
        "flex items-center justify-center",
      )}
    >
      {/* left brand */}
      {showBrand && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
          <WizardMascot src={logo} size={brandSize} showText={false} />
        </div>
      )}

      {/* center title */}
      <h2 className="text-lg md:text-xl font-semibold text-wizard-text/80">
        {title}
      </h2>
      {/* right cluster: chip + close */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-3">
        {rightSlot}

        <button
          type="button"
          onClick={onClose}
          title="Close Wizard"
          aria-label="Close wizard"
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
