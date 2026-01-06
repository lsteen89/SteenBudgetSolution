import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CardShell from "@/components/atoms/cards/CardShell";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import type { BreakdownItem } from "@/hooks/dashboard/dashboardSummary.types";
import MiniGradientBar from "@/components/atoms/charts/MiniGradientBar";

type Props = {
    totalIncome: number;
    currency: CurrencyCode;
    items: BreakdownItem[];
    maxVisible?: number; // default 4
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const IncomeBreakdownCard: React.FC<Props> = ({
    totalIncome,
    currency,
    items,
    maxVisible = 4,
}) => {
    const [expanded, setExpanded] = useState(false);

    const normalized = useMemo(() => {
        const denom = Math.max(1, Math.abs(totalIncome));
        return items
            .slice()
            .sort((a, b) => b.amount - a.amount)
            .map((i) => ({
                ...i,
                pct: clamp01(i.amount / denom),
                pctText: `${Math.round((i.amount / denom) * 100)}%`,
            }));
    }, [items, totalIncome]);

    const visible = expanded ? normalized : normalized.slice(0, maxVisible);
    const hiddenCount = Math.max(0, normalized.length - maxVisible);

    return (
        <CardShell
            title="Inkomster"
            subtitle={<span>Total: {formatMoneyV2(totalIncome, currency)}/mån</span>}
            actions={
                <Link
                    to="/budgets"
                    className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-medium bg-slate-900 text-white hover:bg-slate-800 transition"
                >
                    Redigera budget
                </Link>
            }
        >
            {normalized.length === 0 ? (
                <div className="flex justify-between text-xs text-slate-700">
                    <span>Total inkomst</span>
                    <span className="font-medium tabular-nums">
                        {formatMoneyV2(totalIncome, currency)}
                    </span>
                </div>
            ) : (
                <div className="space-y-2">
                    {visible.map((i) => (
                        <div key={i.key} className="rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2">
                            <div className="flex items-baseline justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="truncate text-xs font-semibold text-slate-800">
                                        {i.label}
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                        {i.meta ? <span className="truncate">{i.meta}</span> : null}
                                        <span className="tabular-nums">{i.pctText}</span>
                                    </div>
                                </div>

                                <div className="shrink-0 text-xs font-semibold text-slate-800 tabular-nums">
                                    {formatMoneyV2(i.amount, currency)}
                                </div>
                            </div>

                            {/* Mini bar */}
                            <MiniGradientBar pct={i.pct} tone="income" />
                        </div>
                    ))}

                    {hiddenCount > 0 ? (
                        <button
                            type="button"
                            onClick={() => setExpanded((s) => !s)}
                            className="w-full rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white/80 transition"
                        >
                            {expanded ? "Visa färre" : `Visa alla (${normalized.length})`}
                        </button>
                    ) : null}
                </div>
            )}
        </CardShell>
    );
};

export default IncomeBreakdownCard;
