import React from "react";
import { Link } from "react-router-dom";
import CardShell from "@/components/atoms/cards/CardShell";
import type { RecurringExpenseSummary } from "@/hooks/dashboard/dashboardSummary.types";

type Props = {
    currency: string;
    subscriptionsTotal: number;
    subscriptionsCount: number;
    subscriptions: RecurringExpenseSummary[];
    maxItems?: number;
};

const SubscriptionsBreakdownCard: React.FC<Props> = ({
    currency,
    subscriptionsTotal,
    subscriptionsCount,
    subscriptions,
    maxItems = 6,
}) => {
    const fmt = (n: number) => `${n.toLocaleString("sv-SE")} ${currency}`;

    return (
        <CardShell
            title="Abonnemang"
            subtitle={
                subscriptionsCount === 0
                    ? "Inga abonnemang registrerade ännu."
                    : `${subscriptionsCount} st • ${fmt(subscriptionsTotal)}/mån`
            }
            actions={
                <Link
                    to="/expenses/subscriptions"
                    className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-medium bg-slate-900 text-white hover:bg-slate-800 transition"
                >
                    Hantera
                </Link>
            }
        >
            {subscriptionsCount > 0 ? (
                <div className="space-y-2 text-xs text-slate-700">
                    {subscriptions.slice(0, maxItems).map((s) => (
                        <div key={s.id} className="flex items-baseline justify-between">
                            <span className="font-medium">{s.name}</span>
                            <span>{fmt(s.amountMonthly)}/mån</span>
                        </div>
                    ))}

                    {subscriptionsCount > maxItems && (
                        <p className="text-[11px] text-slate-500 pt-1">
                            + {subscriptionsCount - maxItems} till…
                        </p>
                    )}
                </div>
            ) : null}
        </CardShell>
    );
};

export default SubscriptionsBreakdownCard;
