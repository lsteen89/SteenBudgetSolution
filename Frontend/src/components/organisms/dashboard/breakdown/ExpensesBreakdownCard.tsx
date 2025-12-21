import React from "react";
import { useNavigate } from "react-router-dom";
import CardShell from "@/components/atoms/cards/CardShell";
import type { RecurringExpenseSummary } from "@/hooks/dashboard/useDashboardSummary";

type Props = {
    totalExpenditure: number;
    currency: string;
    recurringExpenses: RecurringExpenseSummary[];
    maxItems?: number;
};

const ExpensesBreakdownCard: React.FC<Props> = ({
    totalExpenditure,
    currency,
    recurringExpenses,
    maxItems = 5,
}) => {
    const navigate = useNavigate();
    const fmt = (n: number) => `${n.toLocaleString("sv-SE")} ${currency}`;

    return (
        <CardShell
            title="Utgifter"
            subtitle={<span>Total: {fmt(totalExpenditure)}/mån</span>}
            actions={
                <button
                    type="button"
                    onClick={() => navigate("/expenses?view=summary")}
                    className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-medium bg-slate-900 text-white hover:bg-slate-800 transition"
                >
                    Se utgifter
                </button>
            }
        >
            <div className="space-y-2 text-xs text-slate-700">
                {recurringExpenses.slice(0, maxItems).map((e) => (
                    <div key={e.id} className="flex items-baseline justify-between">
                        <div className="flex flex-col">
                            <span className="font-medium">{e.name}</span>
                            <span className="text-[10px] uppercase tracking-wide text-slate-400">
                                {e.categoryName}
                            </span>
                        </div>
                        <span>{fmt(e.amountMonthly)}/mån</span>
                    </div>
                ))}

                {recurringExpenses.length === 0 && (
                    <p className="text-slate-500">Inga återkommande utgifter ännu.</p>
                )}
            </div>
        </CardShell>
    );
};

export default ExpensesBreakdownCard;
