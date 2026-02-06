import React from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import PathCard from "@/components/organisms/debts/PathCard";
import type { RepaymentStrategy } from "@/types/Wizard/Step4_Debt/DebtFormValues";
import { cn } from "@/lib/utils";

type StrategyMeta = {
    targetChip: string;
    heroOutcome: string;
    heroDetail: string;
    subtitle: string;
    tip?: string;
};

type SnowballMeta = StrategyMeta & { footnote?: string };

export default function DebtStrategyPicker({
    selected,
    onSelect,
    onContinue,
    avalanche,
    snowball,
    error,
}: {
    selected?: RepaymentStrategy;
    onSelect: (v: RepaymentStrategy) => void;
    onContinue?: () => void;
    avalanche: StrategyMeta;
    snowball: SnowballMeta;
    error?: string;
}) {
    const chooseLater = () => {
        onSelect("noAction");
        queueMicrotask(() => onContinue?.());
    };

    return (
        <div className="pt-2">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-wizard-text">Välj strategi</h3>
                    <p className="mt-1 text-xs text-wizard-text/60">
                        Välj det som passar dig — du kan alltid ändra senare.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={chooseLater}
                    className={cn(
                        "shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5",
                        "text-xs font-semibold",
                        "bg-wizard-surface border border-wizard-stroke/25",
                        "text-wizard-text/65",
                        "shadow-[0_6px_14px_rgba(2,6,23,0.06)]",
                        "hover:bg-wizard-stroke/10 hover:border-wizard-stroke/35 hover:text-wizard-text/80",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-stroke/45"
                    )}
                >
                    Jag vill välja senare <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            <div className="mt-4 h-px bg-wizard-stroke/20" />

            {/* Cards */}
            <div className="mt-4 grid gap-4">
                <PathCard
                    selected={selected === "avalanche"}
                    icon="mountain"
                    title="Lavinen"
                    heroOutcome={avalanche.heroOutcome}
                    heroDetail={avalanche.heroDetail}
                    subtitle={avalanche.subtitle}
                    targetChip={avalanche.targetChip}
                    tip={avalanche.tip}
                    onSelect={() => onSelect("avalanche")}
                />

                <PathCard
                    selected={selected === "snowball"}
                    icon="footsteps"
                    title="Snöbollen"
                    heroOutcome={snowball.heroOutcome}
                    heroDetail={snowball.heroDetail}
                    subtitle={snowball.subtitle}
                    targetChip={snowball.targetChip}
                    tip={snowball.tip}
                    onSelect={() => onSelect("snowball")}
                />
            </div>

            {/* Footnote */}
            {snowball.footnote && (
                <p className="mt-3 text-xs text-wizard-text/55">{snowball.footnote}</p>
            )}

            {/* Error */}
            {error && (
                <div
                    className={cn(
                        "mt-4 flex items-start gap-2 rounded-2xl p-3",
                        "bg-wizard-warning/10 border border-wizard-warning/25"
                    )}
                    role="alert"
                >
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-wizard-warning shrink-0" />
                    <p className="text-sm font-semibold text-wizard-warning">{error}</p>
                </div>
            )}
        </div>
    );
}
