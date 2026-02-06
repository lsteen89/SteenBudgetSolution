import React from "react";
import { cn } from "@/lib/utils";

type Props = {
    show: boolean;
    onGoToSummary: () => void;
    onContinue: () => void;

    /** Optional labels */
    summaryLabel?: string;
    continueLabel?: string;

    className?: string;
};

export default function WizardSummaryStickyCTA({
    show,
    onGoToSummary,
    onContinue,
    summaryLabel = "Till sammanfattning",
    continueLabel = "Fortsätt",
    className,
}: Props) {
    if (!show) return null;

    return (
        <div className={cn("sticky bottom-0 z-40 pt-3 pb-safe", className)}>
            <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 flex items-center gap-3">
                <button
                    type="button"
                    onClick={onGoToSummary}
                    className={cn(
                        "h-11 px-3 rounded-2xl",
                        "bg-transparent",
                        "text-wizard-text/65 font-semibold",
                        "hover:text-wizard-text hover:bg-wizard-surface/60",
                        "transition-colors",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-accent/25"
                    )}
                >
                    {summaryLabel}
                </button>

                <button
                    type="button"
                    onClick={onContinue}
                    className={cn(
                        "flex-1 h-11 rounded-2xl",
                        "bg-wizard-accent text-white font-semibold",
                        "shadow-[0_10px_30px_rgba(2,6,23,0.12)]",
                        "hover:brightness-95",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-accent/35"
                    )}
                >
                    {continueLabel}
                </button>
            </div>
        </div>
    );
}
