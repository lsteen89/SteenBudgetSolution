import React from "react";
import { useNavigate } from "react-router-dom";
import CardShell from "@/components/atoms/cards/CardShell";

type Props = {
    totalIncome: number;
    currency: string;
};

const IncomeBreakdownCard: React.FC<Props> = ({ totalIncome, currency }) => {
    const navigate = useNavigate();
    const fmt = (n: number) => `${n.toLocaleString("sv-SE")} ${currency}`;

    return (
        <CardShell
            title="Inkomster"
            subtitle={<span>Total: {fmt(totalIncome)}/mån</span>}
            actions={
                <button
                    type="button"
                    onClick={() => navigate("/budgets")}
                    className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-medium bg-slate-900 text-white hover:bg-slate-800 transition"
                >
                    Redigera plan
                </button>
            }
        >
            {/* Keep minimal until you have per-income breakdown */}
            <div className="space-y-2 text-xs text-slate-700">
                <div className="flex justify-between">
                    <span>Total inkomst</span>
                    <span className="font-medium">{fmt(totalIncome)}</span>
                </div>
            </div>
        </CardShell>
    );
};

export default IncomeBreakdownCard;
