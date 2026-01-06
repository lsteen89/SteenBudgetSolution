import React, { useMemo } from "react";
import CardShell from "@/components/atoms/cards/CardShell";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import type { BreakdownItem, RecurringExpenseSummary } from "@/hooks/dashboard/dashboardSummary.types";



type Props = {
    currency: CurrencyCode;

    totalIncome: number;
    totalExpenditure: number;
    totalSavings: number;
    totalDebtPayments: number;
    finalBalance: number;

    expenseCategories: BreakdownItem[]; // breakdown.expenseCategoryItems
    recurringExpenses: RecurringExpenseSummary[]; // summary.recurringExpenses
    subscriptions: RecurringExpenseSummary[]; // summary.subscriptions
    subscriptionsTotal: number;
};

type StatTone = "neutral" | "good" | "warn" | "bad";

function MetricTile({
    label,
    value,
    tone = "neutral",
    hint,
}: {
    label: string;
    value: string;
    tone?: StatTone;
    hint?: string;
}) {
    const toneCls =
        tone === "good" ? "border-emerald-200 bg-emerald-50 text-emerald-800" :
            tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-800" :
                tone === "bad" ? "border-rose-200 bg-rose-50 text-rose-800" :
                    "border-slate-200 bg-slate-50 text-slate-800";

    return (
        <div className={`rounded-xl border p-1.5 ${toneCls} flex flex-col items-center justify-center min-w-0 h-full`}>
            <div className="text-[10px] font-bold uppercase tracking-tight opacity-70 leading-tight">
                {label}
            </div>

            {/* The 'text-[11px]' is our floor. 
               'leading-tight' stops the line height from pushing the box apart.
            */}
            <div className="mt-0.5 text-[11px] font-bold tabular-nums text-center leading-tight break-words w-full">
                {value}
            </div>

            {hint && (
                <div className="mt-0.5 text-[9px] opacity-70 leading-none text-center italic">
                    {hint}
                </div>
            )}
        </div>
    );
}
function ActionRow({ text, value }: { text: React.ReactNode; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/60 px-3 py-2">
            <div className="min-w-0 text-slate-700 text-xs">{text}</div>
            <div className="font-semibold tabular-nums text-slate-900 whitespace-nowrap">{value}</div>
        </div>
    );
}

function ContributionRow({
    label,
    meta,
    amountText,
    pct,
}: {
    label: string;
    meta?: string;
    amountText: string;
    pct: number; // 0..1
}) {
    const width = Math.max(0, Math.min(100, Math.round(pct * 100)));

    return (
        <div className="relative rounded-xl px-2 py-1.5 transition hover:bg-white/70 hover:shadow-sm">
            <div className="absolute inset-y-1 left-1 rounded-lg bg-slate-900/5" style={{ width: `${width}%` }} />
            <div className="relative flex items-baseline justify-between gap-3">
                <div className="min-w-0 flex flex-col">
                    <span className="font-medium text-slate-800 truncate">{label}</span>
                    {meta ? <span className="text-[11px] text-slate-500 truncate">{meta}</span> : null}
                </div>
                <span className="font-medium text-slate-800 whitespace-nowrap">{amountText}</span>
            </div>
        </div>
    );
}

export default function BreakdownInsightsCard({
    currency,
    totalIncome,
    totalExpenditure,
    totalSavings,
    totalDebtPayments,
    finalBalance,
    expenseCategories,
    recurringExpenses,
    subscriptions,
    subscriptionsTotal,
}: Props) {
    const vm = useMemo(() => {
        const outflow = totalExpenditure + totalSavings + totalDebtPayments;

        const savingsRate = totalIncome > 0 ? totalSavings / totalIncome : 0;

        // "Fixed-ish" ratio: rent + subscriptions + debt payments.
        // (Keep it conservative; don't pretend everything recurring is fixed.)
        const rent = expenseCategories.find((x) => x.key === "expense:Rent")?.amount ?? 0;
        const fixedish = rent + subscriptionsTotal + totalDebtPayments;
        const fixedishRatio = totalIncome > 0 ? fixedish / totalIncome : 0;

        const topCats = [...expenseCategories]
            .filter((x) => x.amount > 0)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 4)
            .map((x) => ({ ...x, pct: outflow > 0 ? x.amount / outflow : 0 }));

        const largestSub = [...subscriptions].sort((a, b) => b.amountMonthly - a.amountMonthly)[0];

        const takeout = recurringExpenses
            .filter((x) => x.categoryKey === "Food")
            .sort((a, b) => b.amountMonthly - a.amountMonthly)[0];

        return {
            outflow,
            savingsRate,
            fixedishRatio,
            topCats,
            largestSub,
            takeout,
        };
    }, [
        totalIncome,
        totalExpenditure,
        totalSavings,
        totalDebtPayments,
        expenseCategories,
        subscriptionsTotal,
        subscriptions,
        recurringExpenses,
    ]);

    const balanceTone: StatTone = finalBalance >= 0 ? "good" : "bad";
    const savingsTone: StatTone = vm.savingsRate >= 0.2 ? "good" : vm.savingsRate >= 0.1 ? "warn" : "bad";
    const fixedTone: StatTone = vm.fixedishRatio <= 0.55 ? "good" : vm.fixedishRatio <= 0.7 ? "warn" : "bad";

    return (
        <CardShell
            title="Ekonomisk hälsa"
            subtitle="Analys av ditt kassaflöde."
            className="[&>div:first-child]:flex-col [&>div:first-child]:items-center [&>div:first-child]:text-center"
            stats={
                <div className="grid grid-cols-3 gap-1.5 w-full mt-2">
                    <MetricTile label="Kvar" value={formatMoneyV2(finalBalance, currency)} tone={balanceTone} />
                    <MetricTile label="Sparande" value={`${Math.round(vm.savingsRate * 100)}%`} tone={savingsTone} />
                    <MetricTile label="Fast/Inkomst" value={`${Math.round(vm.fixedishRatio * 100)}%`} tone={fixedTone} hint="Target: <50%" />
                </div>
            }
            footer={
                <div className="flex items-baseline justify-between text-slate-500">
                    <span>Total utflöde</span>
                    <span className="font-semibold text-slate-800">{formatMoneyV2(vm.outflow, currency)}</span>
                </div>
            }
        >
            <div className="space-y-4">
                {/* INSTEAD OF CATEGORIES, WE SHOW RATIOS */}
                <div className="bg-slate-50 rounded-2xl p-3 space-y-2 border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kassaflödes-mix</div>
                    <div className="flex h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: `${vm.savingsRate * 100}%` }} />
                        <div className="bg-amber-500 h-full" style={{ width: `${vm.fixedishRatio * 100}%` }} />
                        <div className="bg-slate-400 h-full" style={{ flex: 1 }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-medium text-slate-600">
                        <span>Sparande</span>
                        <span>Fast</span>
                        <span>Övrigt</span>
                    </div>
                </div>

                {/* QUICK WINS ONLY */}
                <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase">Potential för optimering</div>
                    <ActionRow
                        text={<>Avsluta <span className="font-semibold">{vm.largestSub.nameLabel}</span></>}
                        value={`+ ${formatMoneyV2(vm.largestSub.amountMonthly, currency)}`}
                    />
                </div>
            </div>
        </CardShell>
    );
}
