import React from "react";
import { Link } from "react-router-dom";
import CardShell from "@/components/atoms/cards/CardShell";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import type { BreakdownItem } from "@/hooks/dashboard/dashboardSummary.types";

type Props = {
    totalIncome: number;
    currency: CurrencyCode;
    items: BreakdownItem[];
};

const IncomeBreakdownCard: React.FC<Props> = ({ totalIncome, currency, items }) => {
    return (
        <CardShell
            title="Inkomster"
            subtitle={<span>Total: {formatMoneyV2(totalIncome, currency)}/mån</span>}
            actions={
                <Link
                    to="/budgets"
                    className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-medium bg-slate-900 text-white hover:bg-slate-800 transition"
                >
                    Redigera plan
                </Link>
            }
        >
            <div className="space-y-2 text-xs text-slate-700">
                {items.length === 0 ? (
                    <div className="flex justify-between">
                        <span>Total inkomst</span>
                        <span className="font-medium">{formatMoneyV2(totalIncome, currency)}</span>
                    </div>
                ) : (
                    items.map((i) => (
                        <div key={i.key} className="flex items-baseline justify-between">
                            <div className="flex flex-col">
                                <span className="font-medium">{i.label}</span>
                                {i.meta ? <span className="text-[11px] text-slate-500">{i.meta}</span> : null}
                            </div>
                            <span className="font-medium">{formatMoneyV2(i.amount, currency)}</span>
                        </div>
                    ))
                )}
            </div>
        </CardShell>
    );
};

export default IncomeBreakdownCard;
