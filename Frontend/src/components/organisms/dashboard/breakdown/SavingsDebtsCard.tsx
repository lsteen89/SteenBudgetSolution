import React from "react";
import CardShell from "@/components/atoms/cards/CardShell";

type Props = {
    currency: string;
    totalSavings: number;
    totalDebtPayments: number;
    finalBalance: number;
};

const SavingsDebtsCard: React.FC<Props> = ({ currency, totalSavings, totalDebtPayments, finalBalance }) => {
    const fmt = (n: number) => `${n.toLocaleString("sv-SE")} ${currency}`;
    const toneClass = finalBalance >= 0 ? "text-emerald-600" : "text-rose-600";

    return (
        <CardShell
            title="Sparande & skulder"
            subtitle={
                <>
                    Sparande: {fmt(totalSavings)}/mån • Skuldbetalningar: {fmt(totalDebtPayments)}/mån
                </>
            }
        >
            <div className="border-t border-slate-100 pt-3 flex items-baseline justify-between text-xs">
                <span className="font-semibold text-slate-900">Kvar att spendera</span>
                <span className={`font-semibold ${toneClass}`}>{fmt(finalBalance)}</span>
            </div>
        </CardShell>
    );
};

export default SavingsDebtsCard;
