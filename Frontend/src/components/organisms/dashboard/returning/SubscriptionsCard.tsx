import React from "react";
import type { NavigateFunction } from "react-router-dom";
import type { RecurringExpenseSummary } from "@hooks/dashboard/useDashboardSummary";

type Props = {
    navigate: NavigateFunction;
    currency: string;
    subscriptionsTotal: number;
    subscriptionsCount: number;
    subscriptions: RecurringExpenseSummary[];
    maxItems?: number;
};

const SubscriptionsCard: React.FC<Props> = ({
    navigate,
    currency,
    subscriptionsTotal,
    subscriptionsCount,
    subscriptions,
    maxItems = 6,
}) => {
    const fmt = (n: number) => `${n.toLocaleString("sv-SE")} ${currency}`;

    return (
        <div className="rounded-3xl bg-white/80 border border-slate-100 shadow-sm px-5 py-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-slate-900 mb-1">Abonnemang</h2>
                    <p className="text-xs text-slate-500">
                        {subscriptionsCount === 0
                            ? "Inga abonnemang registrerade ännu."
                            : `${subscriptionsCount} st • ${fmt(subscriptionsTotal)}/mån`}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => navigate("/expenses/subscriptions")}
                    className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-medium bg-slate-900 text-white hover:bg-slate-800 transition"
                >
                    Hantera
                </button>
            </div>

            {subscriptionsCount > 0 && (
                <div className="mt-3 space-y-2 text-xs text-slate-700">
                    {subscriptions.slice(0, maxItems).map((s) => (
                        <div key={s.id} className="flex items-baseline justify-between">
                            <span className="font-medium">{s.name}</span>
                            <span>{fmt(s.amountMonthly)}/mån</span>
                        </div>
                    ))}
                    {subscriptionsCount > maxItems && (
                        <p className="text-[11px] text-slate-500 pt-1">+ {subscriptionsCount - maxItems} till…</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default SubscriptionsCard;
