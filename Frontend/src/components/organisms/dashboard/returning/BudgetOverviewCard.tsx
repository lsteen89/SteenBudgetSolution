import React from "react";

type Props = {
    currency: string;
    totalIncome: number;
    totalExpenditure: number;
    totalSavings: number;
    totalDebtPayments: number;
    remainingToSpend: number;
    finalBalance: number;
};

const BudgetOverviewCard: React.FC<Props> = ({
    currency,
    totalIncome,
    totalExpenditure,
    totalSavings,
    totalDebtPayments,
    remainingToSpend,
    finalBalance,
}) => {
    const fmt = (n: number) => `${n.toLocaleString("sv-SE")} ${currency}`;

    return (
        <div className="rounded-3xl bg-white/80 border border-slate-100 shadow-sm px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Budgetöversikt</h2>
            <p className="text-xs text-slate-500 mb-3">
                Din budget per månad – inkomster, utgifter, sparande och skuldbetalningar.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-slate-700">
                <div>
                    <p className="font-medium text-slate-900">Inkomster</p>
                    <p className="mt-0.5">{fmt(totalIncome)}</p>
                </div>
                <div>
                    <p className="font-medium text-slate-900">Utgifter</p>
                    <p className="mt-0.5">{fmt(totalExpenditure)}</p>
                </div>
                <div>
                    <p className="font-medium text-slate-900">Sparande</p>
                    <p className="mt-0.5">{fmt(totalSavings)}</p>
                </div>
                <div>
                    <p className="font-medium text-slate-900">Skuldbetalningar</p>
                    <p className="mt-0.5">{fmt(totalDebtPayments)}</p>
                </div>
                <div>
                    <p className="font-medium text-slate-900">Kvar att spendera</p>
                    <p className="mt-0.5">{fmt(remainingToSpend)}</p>
                </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 flex items-baseline justify-between text-xs">
                <span className="font-semibold text-slate-900">
                    Resultat (Inkomster − Utgifter − Sparande − Skulder)
                </span>
                <span className={`font-semibold ${finalBalance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {fmt(finalBalance)}
                </span>
            </div>
        </div>
    );
};

export default BudgetOverviewCard;
