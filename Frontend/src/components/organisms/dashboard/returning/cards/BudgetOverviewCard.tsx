import React from "react";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { budgetOverviewCardDict } from "@/utils/i18n/pages/private/dashboard/cards/BudgetOverviewCard.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import type { CurrencyCode } from "@/utils/money/currency";

type Props = {
    currency: CurrencyCode;
    totalIncome?: number | null;
    totalExpenditure?: number | null;
    incomingCarryOverAmount?: number | null;
    totalSavings?: number | null;
    totalDebtPayments?: number | null;
    remainingToSpend?: number | null;
    finalBalance?: number | null;
};

const BudgetOverviewCard: React.FC<Props> = ({
    currency,
    totalIncome,
    totalExpenditure,
    incomingCarryOverAmount,
    totalSavings,
    totalDebtPayments,
    remainingToSpend,
    finalBalance,
}) => {
    const locale = useAppLocale();
    const t = <K extends keyof typeof budgetOverviewCardDict.sv>(key: K) =>
        tDict(key, locale, budgetOverviewCardDict);
    const fmt = (n?: number | null) => formatMoneyV2(n, currency, locale);
    const signedFmt = (n: number) => `+${fmt(Math.abs(n))}`;

    const safeFinal = typeof finalBalance === "number" ? finalBalance : 0;
    const showIncomingCarryOver =
        typeof incomingCarryOverAmount === "number" && incomingCarryOverAmount > 0;

    return (
        <div className="rounded-3xl bg-white/80 border border-slate-100 shadow-sm px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">{t("title")}</h2>
            <p className="text-xs text-slate-500 mb-3">
                {t("subtitle")}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-slate-700">
                {showIncomingCarryOver ? (
                    <div>
                        <p className="font-medium text-slate-900">{t("incomingCarryOver")}</p>
                        <p className="mt-0.5">{signedFmt(incomingCarryOverAmount ?? 0)}</p>
                    </div>
                ) : null}
                <div>
                    <p className="font-medium text-slate-900">{t("income")}</p>
                    <p className="mt-0.5">{fmt(totalIncome)}</p>
                </div>
                <div>
                    <p className="font-medium text-slate-900">{t("expenses")}</p>
                    <p className="mt-0.5">{fmt(totalExpenditure)}</p>
                </div>
                <div>
                    <p className="font-medium text-slate-900">{t("savings")}</p>
                    <p className="mt-0.5">{fmt(totalSavings)}</p>
                </div>
                <div>
                    <p className="font-medium text-slate-900">{t("debtPayments")}</p>
                    <p className="mt-0.5">{fmt(totalDebtPayments)}</p>
                </div>
                <div>
                    <p className="font-medium text-slate-900">{t("leftToSpend")}</p>
                    <p className="mt-0.5">{fmt(remainingToSpend)}</p>
                </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 flex items-baseline justify-between text-xs">
                <span className="font-semibold text-slate-900">
                    {t(showIncomingCarryOver ? "resultWithCarryOver" : "resultWithoutCarryOver")}
                </span>
                <span className={`font-semibold ${safeFinal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {fmt(finalBalance)}
                </span>
            </div>
        </div>
    );
};

export default BudgetOverviewCard;
