import React from "react";
import { cn } from "@/lib/utils";

type Props = {
    /** Example: 3 */
    stepNumber?: number;

    /** Example: "Sparande" */
    majorLabel: string;

    /** Example: "Vanor" (optional) */
    subLabel?: string;

    /** Center or left align */
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
    return (
        <div className={cn(align === "center" ? "flex justify-center" : "flex justify-start")}>
            <span
                className={cn(
                    "inline-flex items-center gap-2 rounded-full",
                    "bg-wizard-surface border border-wizard-stroke/20",
                    "px-4 py-1.5 text-[13px] font-semibold",
                    "text-wizard-text/75 shadow-sm shadow-black/5",
                    className
                )}
            >
                {typeof stepNumber === "number" ? (
                    <>
                        <span className="text-wizard-accent">Steg {stepNumber}</span>
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
