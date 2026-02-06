import React from "react";
import { Gauge, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import WizardCard from "@/components/organisms/overlays/wizard/SharedComponents/Cards/WizardCard";

function aprTone(apr: number) {
    // Use wizard tokens only (no rose/yellow). “Warning” for high APR.
    if (apr >= 18) {
        return {
            label: "Hög",
            cls: cn(
                "text-wizard-warning",
                "bg-wizard-warning/10",
                "border-wizard-warning/25"
            ),
        };
    }
    if (apr >= 8) {
        return {
            label: "Mellan",
            cls: cn(
                "text-wizard-text/75",
                "bg-wizard-surface-accent/55",
                "border-wizard-stroke/25"
            ),
        };
    }
    return {
        label: "Låg",
        cls: cn(
            "text-wizard-text/70",
            "bg-wizard-surface-accent/50",
            "border-wizard-stroke/20"
        ),
    };
}

export default function DebtSnapshotCard({
    totalBalance,
    avgApr,
    money0,
}: {
    totalBalance: number;
    avgApr: number;
    money0: (v: number) => string;
}) {
    const tone = aprTone(avgApr);

    return (
        <WizardCard
        >


            <div className="relative">
                <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-wizard-accent" />
                    <h3 className="text-sm font-semibold text-wizard-text">Översikt</h3>
                </div>

                <div className="mt-3 h-px bg-wizard-stroke/20" />

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Total debt */}
                    <div
                        className={cn(
                            "rounded-2xl p-4",
                            "bg-wizard-surface-accent/40",
                            "border border-wizard-stroke/80",
                            "shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
                        )}
                    >
                        <p className="text-xs font-semibold text-wizard-text/55">
                            Total skuld
                        </p>
                        <p className="mt-1 font-mono text-lg font-extrabold text-wizard-text tabular-nums">
                            {money0(totalBalance)}
                        </p>
                    </div>

                    {/* Avg APR */}
                    <div
                        className={cn(
                            "rounded-2xl p-4",
                            "bg-wizard-surface-accent/40",
                            "border border-wizard-stroke/80",
                            "shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
                        )}
                    >
                        <div className="flex items-baseline justify-between gap-3">
                            {/* left: icon + label */}
                            <div className="flex items-center gap-2 min-w-0">

                                <p className="min-w-0 truncate text-xs font-semibold leading-none text-wizard-text/55">
                                    Genomsnittlig ränta
                                </p>
                            </div>

                            {/* right: badge */}
                            <span
                                className={cn(
                                    "shrink-0 rounded-full px-2 py-0.5 border",
                                    "text-[11px] font-semibold leading-none",
                                    tone.cls
                                )}
                            >
                                {tone.label}
                            </span>
                        </div>

                        <p className="mt-1 font-mono text-lg font-extrabold text-wizard-text tabular-nums">
                            {Number.isFinite(avgApr) ? avgApr.toFixed(1) : "—"}
                            <span className="ml-0.5 text-sm font-semibold text-wizard-text/55">%</span>
                        </p>
                    </div>
                </div>
            </div>
        </WizardCard>
    );
}
