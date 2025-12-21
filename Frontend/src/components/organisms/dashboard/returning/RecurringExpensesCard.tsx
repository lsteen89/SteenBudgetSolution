import React from "react";
import type { NavigateFunction } from "react-router-dom";
import type { RecurringExpenseSummary } from "@hooks/dashboard/useDashboardSummary";

type Props = {
    navigate: NavigateFunction;
    currency: string;
    recurringExpenses: RecurringExpenseSummary[];
    maxItems?: number;
};

const RecurringExpensesCard: React.FC<Props> = ({ navigate, currency, recurringExpenses, maxItems = 5 }) => {
    const fmt = (n: number) => `${n.toLocaleString("sv-SE")} ${currency}`;

    return (
        <div className="rounded-3xl bg-white/80 border border-slate-100 shadow-sm px-5 py-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-slate-900 mb-1">Återkommande kostnader</h2>
                    <p className="text-xs text-slate-500">Dina största fasta utgifter per månad (Top 5) – exkl. abonnemang.</p>
                </div>
                <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700">
                    Top 5
                </span>
            </div>

            <div className="mt-3 space-y-2 text-xs text-slate-700">
                {recurringExpenses.length === 0 ? (
                    <p className="text-slate-500">Du har inte lagt till några återkommande kostnader ännu.</p>
                ) : (
                    recurringExpenses.slice(0, maxItems).map((e) => (
                        <div key={e.id} className="flex items-baseline justify-between">
                            <div className="flex flex-col">
                                <span className="font-medium">{e.name}</span>
                                <span className="text-[10px] uppercase tracking-wide text-slate-400">{e.categoryName}</span>
                            </div>
                            <span>{fmt(e.amountMonthly)}/mån</span>
                        </div>
                    ))
                )}
            </div>

            <button
                type="button"
                onClick={() => navigate("/expenses/recurring")}
                className="mt-4 inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-medium bg-slate-900 text-white hover:bg-slate-800 transition"
            >
                Visa alla fasta kostnader
            </button>
        </div>
    );
};

export default RecurringExpensesCard;
