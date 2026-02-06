import React from "react";
import clsx from "clsx";

export type WizardTone = "neutral" | "muted" | "warn";

type Props = {
    label: string;
    value: React.ReactNode;
    tone?: WizardTone;
    className?: string;
    muted?: boolean;
};

export default function WizardStatTile({
    label,
    value,
    tone = "neutral",
    className,
    muted,
}: Props) {
    return (
        <div className={clsx("rounded-xl border border-white/10 bg-white/5 p-3", className)}>
            <div className="text-xs text-wizard-text/50">{label}</div>

            <div
                className={clsx(
                    "mt-1 text-sm font-semibold",
                    tone === "neutral" && "text-wizard-text/85",
                    tone === "muted" && "text-wizard-text/55",
                    tone === "warn" && "text-wizard-warning",
                )}
            >
                {value}
            </div>
        </div>
    );
}
