import React from "react";
import KpiCard from "@components/molecules/cards/dashboard/KpiCard";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import type { CurrencyCode } from "@/utils/money/currency";

type Props = {
    remainingToSpend: number;
    currency: CurrencyCode;
    goalsProgressPercent: number;
    emergencyFundAmount: number;
    emergencyFundMonths: number;
};

const KpiRow: React.FC<Props> = ({
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
                value={formatMoneyV2(remainingToSpend, currency)}
                subtitle="för denna månad"
                tone={remainingToSpend >= 0 ? "positive" : "warning"}
                to="/dashboard/breakdown"
            />
            <KpiCard
                label="Mot dina mål"
                value={`${goalsProgressPercent.toFixed(0)} %`}
                subtitle="Övergripande framsteg"
                tone="neutral"
                to="/goals"
            />
            <KpiCard
                label="Nödfond"
                value={formatMoneyV2(emergencyFundAmount, currency)}
                subtitle={`${emergencyFundMonths.toFixed(1)} månader av utgifter`}
                tone="neutral"
                to="/emergency-fund"
            />
        </div>
    );
};

export default KpiRow;
