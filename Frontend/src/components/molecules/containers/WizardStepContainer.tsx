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
}

const WizardStepContainer: React.FC<WizardStepContainerProps> = ({
  children,
  className = "",
  maxWidth = "responsive",
}) => {
  const widthClass =
    maxWidth === "none"
      ? ""
      : maxWidth === "responsive"
      ? "sm:max-w-md md:max-w-xl lg:max-w-4xl"
      : wizardWidths[maxWidth];

  return (
    <div
      className={cn(
        "space-y-4 p-6 rounded-xl shadow-md mx-auto bg-darkBlueMenuColor",
        widthClass,
        className,
      )}
    >
      {children}
    </div>
  );
};

export default React.memo(WizardStepContainer);