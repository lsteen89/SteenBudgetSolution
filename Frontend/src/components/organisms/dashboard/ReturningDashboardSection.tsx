import React from 'react';
import type { NavigateFunction } from 'react-router-dom';

import KpiCard from '@components/molecules/cards/dashboard/KpiCard';
import PlayfulBirdCard from '@components/molecules/cards/dashboard/PlayfulBirdCard';
import type { DashboardSummary } from '@hooks/dashboard/useDashboardSummary';

export interface ReturningDashboardSectionProps {
    navigate: NavigateFunction;
    onOpenWizard: () => void;
    summary: DashboardSummary;
}

const ReturningDashboardSection: React.FC<ReturningDashboardSectionProps> = ({
    navigate,
    onOpenWizard,
    summary,
}) => {
    const {
        monthLabel,
        remainingToSpend,
        remainingCurrency,
        emergencyFundAmount,
        emergencyFundMonths,
        goalsProgressPercent,
        totalIncome,
        totalExpenditure,
        totalSavings,
        totalDebtPayments,
        finalBalance,
        pillarDescriptions,
        recurringExpenses,
        subscriptionsTotal,
        subscriptionsCount,
        subscriptions,
    } = summary;

    const formatAmount = (value: number) =>
        `${value.toLocaleString('sv-SE')} ${remainingCurrency}`;

    return (
        <div className="w-full max-w-6xl space-y-6">
            {/* Header with actions + KPI row */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Välkommen tillbaka 👋</h1>
                        <p className="text-sm text-slate-600">
                            {monthLabel} – du har{' '}
                            <span className="font-semibold">
                                {remainingToSpend.toLocaleString('sv-SE')} {remainingCurrency}
                            </span>{' '}
                            kvar att spendera.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => navigate('/budgets')}
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <KpiCard
                        label="Kvar att spendera"
                        value={`${remainingToSpend.toLocaleString('sv-SE')} ${remainingCurrency}`}
                        subtitle="för denna månad"
                        tone={remainingToSpend >= 0 ? 'positive' : 'warning'}
                        onClick={() => navigate('/expenses')}
                    />
                    <KpiCard
                        label="Mot dina mål"
                        value={`${goalsProgressPercent.toFixed(0)} %`}
                        subtitle="Övergripande framsteg"
                        tone="neutral"
                        onClick={() => navigate('/goals')}
                    />
                    <KpiCard
                        label="Nödfond"
                        value={`${emergencyFundAmount.toLocaleString('sv-SE')} ${remainingCurrency}`}
                        subtitle={`${emergencyFundMonths.toFixed(1)} månader av utgifter`}
                        tone="neutral"
                        onClick={() => navigate('/emergency-fund')}
                    />
                </div>
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: “money flow” */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Budget snapshot instead of placeholder */}
                    <div className="rounded-3xl bg-white/80 border border-slate-100 shadow-sm px-5 py-4">
                        <h2 className="text-sm font-semibold text-slate-900 mb-1">Budgetöversikt</h2>
                        <p className="text-xs text-slate-500 mb-3">
                            Din budget per månad – inkomster, utgifter, sparande och skuldbetalningar.
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-slate-700">
                            <div>
                                <p className="font-medium text-slate-900">Inkomster</p>
                                <p className="mt-0.5">{formatAmount(totalIncome)}</p>
                            </div>
                            <div>
                                <p className="font-medium text-slate-900">Utgifter</p>
                                <p className="mt-0.5">{formatAmount(totalExpenditure)}</p>
                            </div>
                            <div>
                                <p className="font-medium text-slate-900">Sparande</p>
                                <p className="mt-0.5">{formatAmount(totalSavings)}</p>
                            </div>
                            <div>
                                <p className="font-medium text-slate-900">Skuldbetalningar</p>
                                <p className="mt-0.5">{formatAmount(totalDebtPayments)}</p>
                            </div>
                            <div>
                                <p className="font-medium text-slate-900">Kvar att spendera</p>
                                <p className="mt-0.5">{formatAmount(remainingToSpend)}</p>
                            </div>
                        </div>

                        <div className="mt-4 border-t border-slate-100 pt-3 flex items-baseline justify-between text-xs">
                            <span className="font-semibold text-slate-900">
                                Resultat (Inkomster − Utgifter − Sparande − Skulder)
                            </span>
                            <span
                                className={`font-semibold ${finalBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                    }`}
                            >
                                {formatAmount(finalBalance)}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Recurring (Top 5 excluding subscriptions) */}
                        <div className="rounded-3xl bg-white/80 border border-slate-100 shadow-sm px-5 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-sm font-semibold text-slate-900 mb-1">
                                        Återkommande kostnader
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Dina största fasta utgifter per månad (Top 5) – exkl. abonnemang.
                                    </p>
                                </div>

                                <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700">
                                    Top 5
                                </span>
                            </div>

                            <div className="mt-3 space-y-2 text-xs text-slate-700">
                                {recurringExpenses.length === 0 && (
                                    <p className="text-slate-500">
                                        Du har inte lagt till några återkommande kostnader ännu.
                                    </p>
                                )}

                                {recurringExpenses.map((e) => (
                                    <div key={e.id} className="flex items-baseline justify-between">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{e.name}</span>
                                            <span className="text-[10px] uppercase tracking-wide text-slate-400">
                                                {e.categoryName}
                                            </span>
                                        </div>
                                        <span>{formatAmount(e.amountMonthly)}/mån</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() => navigate('/expenses/recurring')}
                                className="mt-4 inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-medium bg-slate-900 text-white hover:bg-slate-800 transition"
                            >
                                Visa alla fasta kostnader
                            </button>
                        </div>

                        {/* Subscriptions */}
                        <div className="rounded-3xl bg-white/80 border border-slate-100 shadow-sm px-5 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-sm font-semibold text-slate-900 mb-1">Abonnemang</h2>
                                    <p className="text-xs text-slate-500">
                                        {subscriptionsCount === 0
                                            ? "Inga abonnemang registrerade ännu."
                                            : `${subscriptionsCount} st • ${formatAmount(subscriptionsTotal)}/mån`}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => navigate('/expenses/subscriptions')}
                                    className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-medium bg-slate-900 text-white hover:bg-slate-800 transition"
                                >
                                    Hantera
                                </button>
                            </div>

                            {subscriptionsCount > 0 && (
                                <div className="mt-3 space-y-2 text-xs text-slate-700">
                                    {subscriptions.slice(0, 6).map((s) => (
                                        <div key={s.id} className="flex items-baseline justify-between">
                                            <span className="font-medium">{s.name}</span>
                                            <span>{formatAmount(s.amountMonthly)}/mån</span>
                                        </div>
                                    ))}

                                    {subscriptionsCount > 6 && (
                                        <p className="text-[11px] text-slate-500 pt-1">
                                            + {subscriptionsCount - 6} till…
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: goals, emergency fund, next steps */}
                <div className="space-y-4">
                    <div className="rounded-3xl bg-white/80 border border-slate-100 shadow-sm px-5 py-4">
                        <h2 className="text-sm font-semibold text-slate-900 mb-2">Mål</h2>
                        <p className="text-xs text-slate-500 mb-3">
                            {pillarDescriptions.savings}
                        </p>
                        <div className="space-y-2 text-xs text-slate-700">
                            <div>
                                <div className="flex justify-between mb-0.5">
                                    <span>Nödfond</span>
                                    <span>{goalsProgressPercent.toFixed(0)} %</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-400"
                                        style={{ width: `${goalsProgressPercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <PlayfulBirdCard
                        title="Fortsätt din resa"
                        description="Du är på rätt spår – granska din guide en gång i månaden för att hålla din plan i linje med verkligheten."
                        ctaLabel="Öppna guiden"
                        onClick={onOpenWizard}
                    />

                    <PlayfulBirdCard
                        title="Lägg till denna veckas transaktioner"
                        description="Att logga dagens utgifter tar mindre än en minut och ger dig mycket bättre beslut imorgon."
                        ctaLabel="Lägg till utgifter"
                        onClick={() => navigate('/expenses')}
                    />
                </div>
            </div>
        </div >
    );
};

export default ReturningDashboardSection;
