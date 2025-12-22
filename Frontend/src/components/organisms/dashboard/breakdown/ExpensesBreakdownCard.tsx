import React from "react";
import { Link } from "react-router-dom";
import CardShell from "@/components/atoms/cards/CardShell";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import type { BreakdownItem, RecurringExpenseSummary } from "@/hooks/dashboard/dashboardSummary.types";

type Props = {
    totalExpenditure: number;
    currency: CurrencyCode;

    categoryItems: BreakdownItem[];
    recurringExpenses: RecurringExpenseSummary[];
    maxItems?: number;
};

const ExpensesBreakdownCard: React.FC<Props> = ({
    totalExpenditure,
    currency,
    categoryItems,
    recurringExpenses,
    maxItems = 5,
}) => {
    return (
        <CardShell
            title="Utgifter"
            subtitle={<span>Total: {formatMoneyV2(totalExpenditure, currency)}/mån</span>}
            actions={
                <Link
                    to="/expenses?view=summary"
                    className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-medium bg-slate-900 text-white hover:bg-slate-800 transition"
                >
                    Se utgifter
                </Link>
            }
        >
            <div className="space-y-3 text-xs text-slate-700">
                {/* Categories */}
                <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Kategorier</div>

                    {categoryItems.length === 0 ? (
                        <p className="text-slate-500">Inga utgifter registrerade.</p>
                    ) : (
                        categoryItems.map((c) => (
                            <div key={c.key} className="flex items-baseline justify-between">
                                <span className="font-medium">{c.label}</span>
                                <span>{formatMoneyV2(c.amount, currency)}/mån</span>
                            </div>
                        ))
                    )}
                </div>

                {/* Top recurring */}
                <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Största fasta utgifter</div>

                    {recurringExpenses.length === 0 ? (
                        <p className="text-slate-500">Inga återkommande utgifter ännu.</p>
                    ) : (
                        recurringExpenses.slice(0, maxItems).map((e) => (
                            <div key={e.id} className="flex items-baseline justify-between">
                                <div className="flex flex-col">
                                    <span className="font-medium">{e.name}</span>
                                    <span className="text-[10px] uppercase tracking-wide text-slate-400">{e.categoryName}</span>
                                </div>
                                <span>{formatMoneyV2(e.amountMonthly, currency)}/mån</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </CardShell>
    );
};

export default ExpensesBreakdownCard;
