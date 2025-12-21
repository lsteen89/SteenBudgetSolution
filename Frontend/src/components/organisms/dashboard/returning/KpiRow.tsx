import React from "react";
import type { NavigateFunction } from "react-router-dom";
import KpiCard from "@components/molecules/cards/dashboard/KpiCard";

type Props = {
    navigate: NavigateFunction;
    remainingToSpend: number;
    currency: string;
    goalsProgressPercent: number;
    emergencyFundAmount: number;
    emergencyFundMonths: number;
};

const KpiRow: React.FC<Props> = ({
    navigate,
    remainingToSpend,
    currency,
    goalsProgressPercent,
    emergencyFundAmount,
    emergencyFundMonths,
}) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KpiCard
                label="Kvar att spendera"
                value={`${remainingToSpend.toLocaleString("sv-SE")} ${currency}`}
                subtitle="för denna månad"
                tone={remainingToSpend >= 0 ? "positive" : "warning"}
                onClick={() => navigate("/dashboard/breakdown")}
            />
            <KpiCard
                label="Mot dina mål"
                value={`${goalsProgressPercent.toFixed(0)} %`}
                subtitle="Övergripande framsteg"
                tone="neutral"
                onClick={() => navigate("/goals")}
            />
            <KpiCard
                label="Nödfond"
                value={`${emergencyFundAmount.toLocaleString("sv-SE")} ${currency}`}
                subtitle={`${emergencyFundMonths.toFixed(1)} månader av utgifter`}
                tone="neutral"
                onClick={() => navigate("/emergency-fund")}
            />
        </div>
    );
};

export default KpiRow;
