import React from "react";
import CardShell from "@/components/atoms/cards/CardShell";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import type { BreakdownItem } from "@/hooks/dashboard/dashboardSummary.types";

type Props = {
    currency: CurrencyCode;
    totalSavings: number;
    totalDebtPayments: number;
    finalBalance: number;

    savingsItems: BreakdownItem[];
    debtItems: BreakdownItem[];
};

const SavingsDebtsCard: React.FC<Props> = ({
    currency,
    totalSavings,
    totalDebtPayments,
    finalBalance,
    savingsItems,
    debtItems,
}) => {
    const toneClass = finalBalance >= 0 ? "text-emerald-600" : "text-rose-600";

    return (
        <CardShell
            title="Sparande & skulder"
            subtitle={
                <>
                    Sparande: {formatMoneyV2(totalSavings, currency)}/mån • Skuldbetalningar:{" "}
                    {formatMoneyV2(totalDebtPayments, currency)}/mån
                </>
            }
        >
            <div className="space-y-4">
                {(savingsItems.length > 0 || debtItems.length > 0) && (
                    <div className="space-y-3 text-xs text-slate-700">
                        {savingsItems.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Sparande</div>
                                {savingsItems.map((s) => (
                                    <div key={s.key} className="flex items-baseline justify-between">
                                        <span className="font-medium">{s.label}</span>
                                        <span>{formatMoneyV2(s.amount, currency)}/mån</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {debtItems.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Skulder</div>
                                {debtItems.map((d) => (
                                    <div key={d.key} className="flex items-baseline justify-between">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{d.label}</span>
                                            {d.meta ? <span className="text-[11px] text-slate-500">{d.meta}</span> : null}
                                        </div>
                                        <span>{formatMoneyV2(d.amount, currency)}/mån</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="border-t border-slate-100 pt-3 flex items-baseline justify-between text-xs">
                    <span className="font-semibold text-slate-900">Kvar att spendera</span>
                    <span className={`font-semibold ${toneClass}`}>{formatMoneyV2(finalBalance, currency)}</span>
                </div>
            </div>
        </CardShell>
    );
};

export default SavingsDebtsCard;
