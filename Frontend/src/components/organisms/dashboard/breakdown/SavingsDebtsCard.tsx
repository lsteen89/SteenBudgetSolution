import React, { useMemo } from "react";
import CardShell from "@/components/atoms/cards/CardShell";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import type { BreakdownItem } from "@/hooks/dashboard/dashboardSummary.types";
import MiniGradientBar from "@/components/atoms/charts/MiniGradientBar";

type Props = {
    currency: CurrencyCode;
    totalSavings: number;
    totalDebtPayments: number;
    finalBalance: number;

    savingsItems: BreakdownItem[];
    debtItems: BreakdownItem[];
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function Row({
    label,
    value,
    pct,
    tone,
    meta,
}: {
    label: string;
    value: string;
    pct: number;
    tone: "savings" | "danger";
    meta?: string;
}) {
    return (
        <div className="group/row rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2">
            <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-slate-800">{label}</div>
                    {meta ? <div className="text-[11px] text-slate-500 truncate">{meta}</div> : null}
                </div>
                <div className="shrink-0 text-xs font-semibold text-slate-800 tabular-nums">{value}</div>
            </div>

            <MiniGradientBar pct={pct} tone={tone} className="mt-1" />
        </div>
    );
}

const SavingsDebtsCard: React.FC<Props> = ({
    currency,
    totalSavings,
    totalDebtPayments,
    finalBalance,
    savingsItems,
    debtItems,
}) => {
    const toneClass = finalBalance >= 0 ? "text-emerald-600" : "text-rose-600";

    const savingsVm = useMemo(() => {
        const denom = Math.max(1, Math.abs(totalSavings));
        return savingsItems
            .filter((x) => x.amount > 0)
            .slice()
            .sort((a, b) => b.amount - a.amount)
            .map((s) => ({
                ...s,
                pct: clamp01(s.amount / denom),
            }));
    }, [savingsItems, totalSavings]);

    const debtsVm = useMemo(() => {
        const denom = Math.max(1, Math.abs(totalDebtPayments));
        return debtItems
            .filter((x) => x.amount > 0)
            .slice()
            .sort((a, b) => b.amount - a.amount)
            .map((d) => ({
                ...d,
                pct: clamp01(d.amount / denom),
            }));
    }, [debtItems, totalDebtPayments]);

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
                {/** Savings */}
                {savingsVm.length > 0 && (
                    <section className="rounded-2xl border border-slate-200/70 bg-sky-50/40 p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Sparande</div>
                            <div className="text-[11px] font-semibold text-slate-600 tabular-nums">
                                {formatMoneyV2(totalSavings, currency)}/mån
                            </div>
                        </div>

                        <div className="grid gap-3">
                            {savingsVm.map((s) => (
                                <Row
                                    key={s.key}
                                    label={s.label}
                                    value={`${formatMoneyV2(s.amount, currency)}/mån`}
                                    pct={s.pct}
                                    tone="savings"
                                    meta={s.meta}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/** Divider */}
                {savingsVm.length > 0 && debtsVm.length > 0 && (
                    <div className="my-3 flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200/80" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            vs
                        </span>
                        <div className="h-px flex-1 bg-slate-200/80" />
                    </div>
                )}

                {/** Debts */}
                {debtsVm.length > 0 && (
                    <section className="rounded-2xl border border-slate-200/70 bg-rose-50/35 p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Skulder</div>
                            <div className="text-[11px] font-semibold text-slate-600 tabular-nums">
                                {formatMoneyV2(totalDebtPayments, currency)}/mån
                            </div>
                        </div>

                        <div className="grid gap-3">
                            {debtsVm.map((d) => (
                                <Row
                                    key={d.key}
                                    label={d.label}
                                    value={`${formatMoneyV2(d.amount, currency)}/mån`}
                                    pct={d.pct}
                                    tone="danger"
                                    meta={d.meta}
                                />
                            ))}
                        </div>
                    </section>
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
