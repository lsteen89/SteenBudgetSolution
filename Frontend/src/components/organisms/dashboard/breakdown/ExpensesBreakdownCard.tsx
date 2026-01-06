import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CardShell from "@/components/atoms/cards/CardShell";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import type { BreakdownItem, RecurringExpenseSummary } from "@/hooks/dashboard/dashboardSummary.types";
import { ChevronDown, ChevronUp } from "lucide-react";
import MiniGradientBar from "@/components/atoms/charts/MiniGradientBar";

type Props = {
    totalExpenditure: number;
    currency: CurrencyCode;

    categoryItems: BreakdownItem[];
    recurringExpenses: RecurringExpenseSummary[];
    maxItems?: number;
};

function MiniBarRow({
    label,
    amountText,
    pct,
    meta,
}: {
    label: string;
    amountText: string;
    pct: number; // 0..1
    meta?: string;
}) {
    return (
        <div className="group/row">
            <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                    <div className="font-medium text-slate-800 truncate">{label}</div>
                    {meta ? <div className="text-[11px] text-slate-500">{meta}</div> : null}
                </div>
                <div className="font-medium text-slate-800 tabular-nums whitespace-nowrap">{amountText}</div>
            </div>

            <MiniGradientBar pct={pct} tone="expense" className="mt-1" />
        </div>
    );
}


function Pill({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            {children}
        </span>
    );
}
export default function ExpensesBreakdownCard({
    totalExpenditure,
    currency,
    categoryItems,
    recurringExpenses,
    maxItems = 3,
}: Props) {
    const [showAllCats, setShowAllCats] = useState(false);

    const vm = useMemo(() => {
        const cats = [...categoryItems]
            .filter((x) => x.amount > 0)
            .sort((a, b) => b.amount - a.amount);

        const totalCats = cats.reduce((a, x) => a + x.amount, 0);

        return {
            cats,
            totalCats,
            visibleInitial: cats.slice(0, maxItems),
            hiddenRemaining: cats.slice(maxItems),
            hasMore: cats.length > maxItems,
        };
    }, [categoryItems, maxItems]);

    return (
        <CardShell
            title="Utgiftsanalys"
            subtitle="Kategoriserad sammanfattning av månaden"
            className="w-full"
            actions={
                <Link to="/expenses" className="text-[11px] font-bold text-slate-400 hover:text-slate-900 transition underline underline-offset-4">
                    Hantera alla
                </Link>
            }
            stats={
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Total utgift</span>
                    <span className="text-xl font-bold text-slate-900 mt-1">
                        {formatMoneyV2(totalExpenditure, currency)}
                    </span>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="space-y-3">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kategorier</span>

                    {/* 1. Initial items - Always visible */}
                    <div className="grid gap-4">
                        {vm.visibleInitial.map((c) => (
                            <MiniBarRow
                                key={c.key}
                                label={c.label}
                                amountText={formatMoneyV2(c.amount, currency)}
                                pct={vm.totalCats > 0 ? c.amount / vm.totalCats : 0}
                                meta={
                                    totalExpenditure > 0
                                        ? `${Math.round((c.amount / totalExpenditure) * 100)}% av totalt`
                                        : "—"
                                }
                            />
                        ))}
                    </div>

                    {/* 2. Hidden items - This is where the magic happens */}
                    <div
                        className={`grid transition-all duration-500 ease-in-out ${showAllCats ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0 mt-0"
                            }`}
                    >
                        <div className="overflow-hidden">
                            <div className="grid gap-4">
                                {vm.hiddenRemaining.map((c) => (
                                    <MiniBarRow
                                        key={c.key}
                                        label={c.label}
                                        amountText={formatMoneyV2(c.amount, currency)}
                                        pct={vm.totalCats > 0 ? c.amount / vm.totalCats : 0}
                                        meta={
                                            totalExpenditure > 0
                                                ? `${Math.round((c.amount / totalExpenditure) * 100)}% av totalt`
                                                : "—"
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 3. The Toggle Button - Placed at the bottom */}
                    {vm.hasMore && (
                        <button
                            onClick={() => setShowAllCats(!showAllCats)}
                            className="flex items-center justify-center w-full py-2.5 mt-2 gap-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-all text-[11px] font-bold uppercase tracking-widest border border-slate-100"
                        >
                            <span>{showAllCats ? "Visa mindre" : `Visa alla (${vm.cats.length})`}</span>
                            <ChevronDown
                                size={14}
                                className={`transition-transform duration-500 ${showAllCats ? "rotate-180" : "rotate-0"}`}
                            />
                        </button>
                    )}
                </div>
                {/* Recurring Items Squeeze */}
                <div className="pt-4 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-3">Största fasta utgifterna</span>
                    <div className="space-y-2">
                        {recurringExpenses.slice(0, 3).map((e) => (
                            <div key={e.id} className="flex items-center justify-between text-xs px-1">
                                <span className="font-medium text-slate-700">{e.nameLabel}</span>
                                <span className="font-bold text-slate-900 tabular-nums">{formatMoneyV2(e.amountMonthly, currency)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </CardShell>
    );
}