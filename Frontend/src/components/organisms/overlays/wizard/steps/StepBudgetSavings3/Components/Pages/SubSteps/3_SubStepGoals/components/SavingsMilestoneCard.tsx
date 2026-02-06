import React, { useMemo } from "react";
import { TrendingUp, Zap, ShieldCheck, Sparkles } from "lucide-react";

import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import {
    monthsToTarget,
    formatDuration,
    calculateBoost,
} from "@/utils/budget/savingCalculations";
import { renderEmphasis } from "@/utils/ui/renderEmphasis";
import { clsx } from "clsx";

type Props = {
    monthlySavings?: number | null;
    monthlyIncome?: number | null;
    targetAmount?: number;
    deltaAmount?: number;
};

export default function SavingsMilestoneCard({
    monthlySavings,
    monthlyIncome,
    targetAmount = 1_000_000,
    deltaAmount = 1_000,
}: Props) {
    const locale = useAppLocale();
    const currency = useAppCurrency();

    const savings = Number.isFinite(Number(monthlySavings)) ? Number(monthlySavings) : 0;
    const income = Number.isFinite(Number(monthlyIncome)) ? Number(monthlyIncome) : 0;

    const money0 = React.useCallback(
        (n: number) => formatMoneyV2(n, currency, locale, { fractionDigits: 0 }),
        [currency, locale]
    );

    // ✅ always run hooks, even if savings is 0
    const months = useMemo(
        () => monthsToTarget(savings, targetAmount),
        [savings, targetAmount]
    );

    const timeString = useMemo(
        () => formatDuration(months),
        [months]
    );

    const monthsSaved = useMemo(
        () => calculateBoost(savings, targetAmount, deltaAmount),
        [savings, targetAmount, deltaAmount]
    );

    const rate = useMemo(() => {
        if (income <= 0 || savings <= 0) return null;
        return savings / income;
    }, [income, savings]);

    const rateLabel =
        rate === null
            ? null
            : rate < 0.1
                ? "Bygger buffert"
                : rate < 0.2
                    ? "Stabil sparare"
                    : "Aggressiv sparare 💪";


    if (savings <= 0) return null;

    const help = renderEmphasis("I sammanställningen kommer vi även visa hur **ränta-på-ränta** och marknadstillväxt (t.ex. 7%) kan korta ner din resa till miljonen avsevärt.");

    return (
        <div
            className={clsx(
                "mt-6 rounded-2xl p-4 relative overflow-hidden",
                // glass surface
                "bg-white/[0.55] backdrop-blur-[6px]",
                // crisp border in your stroke system
                "border border-wizard-stroke/60",
                // premium shadow
                "shadow-[0_16px_40px_rgba(2,6,23,0.12)]",
                // subtle inner ring
                "ring-1 ring-white/40"
            )}
        >
            {/* ambient glow (blue + lime) */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-wizard-shell2/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-darkLimeGreen/20 blur-3xl" />

            {/* header */}
            <div className="flex items-center gap-3 mb-2 relative">
                <div
                    className={clsx(
                        "p-2 rounded-xl border",
                        "bg-darkLimeGreen/15 border-darkLimeGreen/25",
                        "shadow-[0_10px_25px_rgba(2,6,23,0.10)]"
                    )}
                >
                    <TrendingUp className="w-4 h-4 text-darkLimeGreen" />
                </div>

                <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
                    <h4 className="text-sm font-semibold text-wizard-text truncate">
                        Milstolpe:{" "}
                        <span className="text-darkLimeGreen">Miljonär</span>
                    </h4>

                    {rateLabel && (
                        <span
                            className={clsx(
                                "shrink-0 text-[11px] px-2 py-1 rounded-full",
                                "bg-white/60 border border-wizard-stroke/60",
                                "text-wizard-text/70"
                            )}
                        >
                            {rateLabel} · {Math.round((rate ?? 0) * 100)}%
                        </span>
                    )}
                </div>
            </div>

            <p className="text-sm text-wizard-text/70 leading-relaxed relative">
                Med ett sparande på{" "}
                <span className="text-wizard-text font-mono font-semibold">{money0(savings)}</span>{" "}
                når du första miljonen om ca{" "}
                <span className="text-darkLimeGreen font-semibold">{timeString}</span>.
            </p>

            {!!monthsSaved && monthsSaved > 0 && (
                <div
                    className={clsx(
                        "mt-3 pt-3 border-t",
                        "border-wizard-stroke/50",
                        "flex items-center gap-2 text-[11px]",
                        "text-wizard-text/70 relative"
                    )}
                >
                    <div className="p-1 rounded-md bg-wizard-shell2/20 border border-wizard-stroke/50">
                        <Zap className="w-3 h-3 text-wizard-shell3" />
                    </div>
                    <span>
                        Spara <b className="text-wizard-text">{money0(deltaAmount)}</b> extra/mån så når du målet{" "}
                        <b className="text-wizard-text">{monthsSaved} månader</b> tidigare.
                    </span>
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-wizard-stroke/50 flex flex-col gap-2 relative">
                <div className="flex items-center gap-2 text-[10px] text-wizard-text/50 uppercase tracking-widest">
                    <div className="p-1 rounded-md bg-amber-500/15 border border-amber-500/20">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                    </div>
                    <span>Kommande analys</span>
                </div>
                <p className="text-[11px] text-wizard-text/60 italic leading-snug">
                    {help}
                </p>
            </div>

            <div className="mt-3 flex items-center gap-2 text-[11px] text-wizard-text/55 relative">
                <ShieldCheck className="w-3 h-3 text-wizard-text/45" />
                <span>En enkel uppskattning utan ränta. Du kan ändra allt senare.</span>
            </div>
        </div>
    );
}

