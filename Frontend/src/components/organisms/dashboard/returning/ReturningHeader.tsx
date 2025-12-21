import React from "react";
import type { NavigateFunction } from "react-router-dom";

type Props = {
    monthLabel: string;
    remainingToSpend: number;
    currency: string;
    navigate: NavigateFunction;
    onOpenWizard: () => void;
};

const ReturningHeader: React.FC<Props> = ({ monthLabel, remainingToSpend, currency, navigate, onOpenWizard }) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
                <h1 className="text-2xl font-semibold text-slate-900">Välkommen tillbaka 👋</h1>
                <p className="text-sm text-slate-600">
                    {monthLabel} – du har{" "}
                    <span className="font-semibold">
                        {remainingToSpend.toLocaleString("sv-SE")} {currency}
                    </span>{" "}
                    kvar att spendera.
                </p>
            </div>

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => navigate("/budgets")}
                    className="px-4 py-2 rounded-full bg-emerald-500 text-white text-sm font-medium shadow hover:bg-emerald-600 transition"
                >
                    Se din budget
                </button>
                <button
                    type="button"
                    onClick={onOpenWizard}
                    className="px-4 py-2 rounded-full border border-emerald-400 text-emerald-700 text-sm font-medium bg-white/70 backdrop-blur hover:bg-emerald-50 transition"
                >
                    Justera din plan
                </button>
            </div>
        </div>
    );
};

export default ReturningHeader;
