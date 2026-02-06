import React from "react";
import { cn } from "@/lib/utils";

type Props = {
    show: boolean;
    className?: string;
};

export default function WizardSummaryJumpHint({ show, className }: Props) {
    if (!show) return null;

    return (
        <div className={cn("mt-2 text-center text-[16px] text-wizard-text/55", className)}>
            Du kan hoppa till <span className="font-semibold text-wizard-accent">Sammanfattning</span> när som helst.
        </div>
    );
}
