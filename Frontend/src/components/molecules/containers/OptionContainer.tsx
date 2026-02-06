import React, { ReactNode } from "react";
import { cn } from "@/utils/cn";

export type OptionContainerVariant = "quiet" | "raised" | "tinted";

interface OptionContainerProps {
  children: ReactNode;
  className?: string;
  isLowPerf?: boolean;
  variant?: OptionContainerVariant;
}

const variants: Record<OptionContainerVariant, string> = {
  quiet: "bg-transparent border-wizard-stroke/40 shadow-none",
  raised: "bg-wizard-surface2 border-wizard-stroke shadow-[0_10px_30px_rgba(0,0,0,0.10)]",
  tinted: "bg-wizard-brandSoft border-wizard-brandStroke shadow-none",
};

const OptionContainer: React.FC<OptionContainerProps> = ({
  children,
  className = "",
  variant = "quiet",
  isLowPerf = false,
}) => {
  return (
    <div
      className={cn(
        "mt-3 rounded-2xl px-3 py-4 md:mt-4 md:px-4 md:py-5 border text-wizard-text",
        variants[variant],
        !isLowPerf && "backdrop-blur-lg",
        className
      )}
    >
      {children}
    </div>
  );
};

export default React.memo(OptionContainer);
