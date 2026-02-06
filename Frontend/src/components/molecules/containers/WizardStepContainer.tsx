import React from "react";
import { wizardWidths } from "@/utils/wizard/ui";
import { cn } from "@/utils/cn";

interface WizardStepContainerProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Width: 'sm' | 'md' | 'lg'            – choose one of the presets
   * 'responsive' (default)               – sm→lg ramp
   * 'none'                               – let content flow full-width
   */
  maxWidth?: keyof typeof wizardWidths | "responsive" | "none";
  isLowPerf?: boolean;
}

const WizardStepContainer: React.FC<WizardStepContainerProps> = ({
  children,
  className = "",
  maxWidth = "responsive",
  isLowPerf = false,
}) => {
  const widthClass =
    maxWidth === "none"
      ? ""
      : maxWidth === "responsive"
        ? "sm:max-w-md md:max-w-xl lg:max-w-4xl"
        : wizardWidths[maxWidth];

  return (
    <div className={cn(
      "mx-auto w-full px-3 sm:px-4 pb-6 rounded-3xl",
      "bg-wizard-surface/40 border border-wizard-stroke",

      "ring-1 ring-white/25",                            // add crispness
      "relative overflow-hidden",
      "before:absolute before:inset-x-0 before:top-0 before:h-10", // was 16
      "before:bg-gradient-to-b before:from-wizard-brandSoft before:to-transparent",
      "before:pointer-events-none",
      "text-wizard-text",
      !isLowPerf && "backdrop-blur-xl",
      "md:space-y-4 md:p-6",
      widthClass,
      className
    )}>
      {children}
    </div>
  );
};


export default React.memo(WizardStepContainer);