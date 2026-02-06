import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Trash2, Info, Target, TrendingUp } from "lucide-react";

import type { Step3FormValues } from "@/types/Wizard/Step3_Savings/Step3FormValues";
import { WizardAccordion } from "@/components/organisms/overlays/wizard/SharedComponents/Accordion/WizardAccordion";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { calculateMonthlyContribution, calcProgress } from "@/utils/budget/financialCalculations";

import SavingsGoalItemRow from "./SavingsGoalItemRow";
import { cn } from "@/lib/utils";

type Props = {
    index: number;
    onRemove: (index: number) => void;
};

function safeNum(n: unknown): number {
    return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

export default function SavingsGoalItemAccordion({ index, onRemove }: Props) {
    const { control } = useFormContext<Step3FormValues>();
    const currency = useAppCurrency();
    const locale = useAppLocale();

    const money0 = React.useMemo(
        () => (n: number) => formatMoneyV2(n, currency, locale, { fractionDigits: 0 }),
        [currency, locale]
    );

    const base = `goals.${index}` as const;
    const goal = useWatch({ control, name: base });

    const name = goal?.name?.trim() || `Mål ${index + 1}`;
    const targetAmount = safeNum(goal?.targetAmount);
    const amountSaved = safeNum(goal?.amountSaved);

    const rawDate = goal?.targetDate ?? null;
    const date = rawDate ? new Date(String(rawDate).split("T")[0]) : null;
    const validDate = date && !Number.isNaN(date.getTime()) ? date : null;

    const monthly = calculateMonthlyContribution(
        targetAmount > 0 ? targetAmount : null,
        amountSaved > 0 ? amountSaved : null,
        validDate
    );

    const progress = calcProgress(
        targetAmount > 0 ? targetAmount : null,
        amountSaved > 0 ? amountSaved : null
    );

    const incomplete = !goal?.name || !targetAmount || !goal?.targetDate;

    const totalText =
        typeof monthly === "number" && Number.isFinite(monthly) && monthly > 0 ? money0(monthly) : "—";

    // Title: wraps nicely and doesn’t fight buttons
    const title = (
        <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 truncate text-wizard-text font-semibold">{name}</span>

                {incomplete ? (
                    <span
                        className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            "border border-wizard-warning/25 bg-wizard-warning/10 text-wizard-warning"
                        )}
                    >
                        Uppgifter saknas
                    </span>
                ) : null}
            </div>

            {/* Mobile: one compact line. Desktop: richer line. */}
            <div className="mt-1">
                {/* Mobile */}
                <div className="flex items-center gap-2 text-[12px] text-wizard-text/65 sm:hidden">
                    <div className="inline-flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-wizard-text/40" />
                        <span className="tabular-nums font-semibold text-wizard-text/80">{progress}%</span>
                    </div>
                    <span className="text-wizard-text/35">•</span>
                    <div className="inline-flex items-center gap-1 min-w-0">
                        <Target className="h-3.5 w-3.5 text-wizard-text/40" />
                        <span className="tabular-nums font-semibold text-wizard-text/80 truncate">
                            {money0(targetAmount)}
                        </span>
                    </div>
                </div>

                {/* Desktop */}
                <div className="hidden sm:block text-xs text-wizard-text/65">
                    Mål:{" "}
                    <span className="tabular-nums font-semibold text-wizard-text/80">{money0(targetAmount)}</span>
                    <span className="text-wizard-text/35"> • </span>
                    Sparat:{" "}
                    <span className="tabular-nums font-semibold text-wizard-text/80">{money0(amountSaved)}</span>
                    <span className="text-wizard-text/35"> • </span>
                    Klart:{" "}
                    <span className="tabular-nums font-semibold text-wizard-text/80">{progress}%</span>
                </div>
            </div>

            {/* Mobile: monthly as a second row “pill” */}
            <div className="mt-2 sm:hidden">
                <div
                    className={cn(
                        "inline-flex items-baseline gap-1 rounded-full px-3 py-1",
                        "bg-wizard-surface border border-wizard-stroke/20 shadow-sm shadow-black/5"
                    )}
                >
                    <span className="money text-sm font-extrabold text-wizard-accent">{totalText}</span>
                    <span className="text-[11px] font-semibold text-wizard-text/55">/mån</span>
                </div>
            </div>
        </div>
    );

    return (
        <WizardAccordion
            value={String(index)}
            title={title}
            // subtitle handled inside title now (for mobile control)
            subtitle={undefined}
            // Desktop keeps the right-side total. Mobile uses the pill row.
            totalText={totalText}
            totalSuffix="/mån"
            variant="shell"
            actions={
                <div
                    role="button"
                    tabIndex={0}
                    aria-label="Ta bort mål"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemove(index);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            onRemove(index);
                        }
                    }}
                    className={cn(
                        "grid h-9 w-9 place-items-center rounded-xl",
                        "bg-wizard-surface border border-wizard-stroke/20",
                        "text-wizard-text/60 shadow-sm shadow-black/5",
                        "transition-colors cursor-pointer select-none",
                        "hover:border-wizard-warning/30 hover:bg-wizard-warning/10 hover:text-wizard-warning",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-stroke/45"
                    )}
                >
                    <Trash2 size={16} />
                </div>
            }
            className="sm:[&_.wizard-accordion-total]:flex [&_.wizard-accordion-total]:hidden"
        >
            <SavingsGoalItemRow index={index} />

            <div className="mt-4 flex items-center gap-2 text-xs text-wizard-text/65">
                <Info size={14} className="text-wizard-text/45" />
                <span>Du kan alltid justera målet senare.</span>
            </div>
        </WizardAccordion>
    );
}
