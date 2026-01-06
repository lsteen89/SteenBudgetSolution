import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import CardShell from "@/components/atoms/cards/CardShell";
import type { RecurringExpenseSummary } from "@/hooks/dashboard/dashboardSummary.types";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

type Props = {
    currency: CurrencyCode;
    recurringExpenses: RecurringExpenseSummary[];
    maxItems?: number;
};

const RecurringExpensesCard: React.FC<Props> = ({ currency, recurringExpenses, maxItems = 5 }) => {
    const items = useMemo(() => {
        return [...recurringExpenses]
            .filter((x) => x.amountMonthly > 0)
            .filter((x) => x.categoryKey !== "Subscription") // exclude subscriptions here
            .sort((a, b) => b.amountMonthly - a.amountMonthly)
            .slice(0, maxItems);
    }, [recurringExpenses, maxItems]);

    return (
        <CardShell
            title="Återkommande kostnader"
            subtitle="Dina största fasta utgifter per månad – exkl. abonnemang."
            actions={
                <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700">
                    Top {maxItems}
                </span>
            }
            footer={
                <Link
                    to="/expenses/recurring"
                    className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-medium bg-slate-900 text-white hover:bg-slate-800 transition"
                >
                    Visa alla fasta kostnader
                </Link>
            }
        >
            <div className="space-y-2 text-xs text-slate-700">
                {items.length === 0 ? (
                    <p className="text-slate-500">Du har inte lagt till några återkommande kostnader ännu.</p>
                ) : (
                    items.map((e) => (
                        <div key={e.id} className="flex items-baseline justify-between gap-3">
                            <div className="min-w-0 flex flex-col">
                                <span className="font-medium truncate">{e.nameLabel}</span>
                                <span className="text-[10px] uppercase tracking-wide text-slate-400">{e.categoryLabel}</span>
                            </div>
                            <span className="tabular-nums whitespace-nowrap">{formatMoneyV2(e.amountMonthly, currency)}/mån</span>
                        </div>
                    ))
                )}
            </div>
        </CardShell>
    );
};

export default RecurringExpensesCard;
