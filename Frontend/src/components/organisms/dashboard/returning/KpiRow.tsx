import React from "react";
import KpiCard from "@components/molecules/cards/dashboard/KpiCard";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import type { CurrencyCode } from "@/utils/money/currency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { kpiRowDict } from "@/utils/i18n/pages/private/dashboard/cards/KpiRow.i18n";
import { tDict } from "@/utils/i18n/translate";

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
    const locale = useAppLocale();
    const t = <K extends keyof typeof kpiRowDict.sv>(key: K) =>
        tDict(key, locale, kpiRowDict);
    const emergencyFundMonthsLabel = t("emergencyFundMonths").replace(
        "{months}",
        emergencyFundMonths.toFixed(1),
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KpiCard
                label={t("leftToSpend")}
                value={formatMoneyV2(remainingToSpend, currency, locale)}
                subtitle={t("thisMonth")}
                tone={remainingToSpend >= 0 ? "positive" : "warning"}
                to="/dashboard/breakdown"
            />
            <KpiCard
                label={t("goalsProgress")}
                value={`${goalsProgressPercent.toFixed(0)} %`}
                subtitle={t("overallProgress")}
                tone="neutral"
                to="/goals"
            />
            <KpiCard
                label={t("emergencyFund")}
                value={formatMoneyV2(emergencyFundAmount, currency, locale)}
                subtitle={emergencyFundMonthsLabel}
                tone="neutral"
                to="/emergency-fund"
            />
        </div>
    );
};

export default KpiRow;
