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
    } = summary;

    return (
        <div className="w-full max-w-6xl space-y-6">
            {/* Header with actions + KPI row */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Welcome back 👋</h1>
                        <p className="text-sm text-slate-600">
                            {monthLabel} – you have{' '}
                            <span className="font-semibold">
                                {remainingToSpend.toLocaleString('sv-SE')} {remainingCurrency}
                            </span>{' '}
                            left to spend.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => navigate('/budgets')}
                            className="px-4 py-2 rounded-full bg-emerald-500 text-white text-sm font-medium shadow hover:bg-emerald-600 transition"
                        >
                            View your budget
                        </button>
                        <button
                            type="button"
                            onClick={onOpenWizard}
                            className="px-4 py-2 rounded-full border border-emerald-400 text-emerald-700 text-sm font-medium bg-white/70 backdrop-blur hover:bg-emerald-50 transition"
                        >
                            Adjust your plan
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <KpiCard
                        label="Left to spend"
                        value={`${remainingToSpend.toLocaleString('sv-SE')} ${remainingCurrency}`}
                        subtitle="For this month"
                        tone={remainingToSpend >= 0 ? 'positive' : 'warning'}
                        onClick={() => navigate('/expenses')}
                    />
                    <KpiCard
                        label="Towards your goals"
                        value={`${goalsProgressPercent.toFixed(0)} %`}
                        subtitle="Overall progress"
                        tone="neutral"
                        onClick={() => navigate('/goals')}
                    />
                    <KpiCard
                        label="Emergency fund"
                        value={`${emergencyFundAmount.toLocaleString('sv-SE')} ${remainingCurrency}`}
                        subtitle={`${emergencyFundMonths.toFixed(1)} months of expenses`}
                        tone="neutral"
                        onClick={() => navigate('/emergency-fund')}
                    />
                </div>
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: “money flow” */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="rounded-3xl bg-white/80 border border-slate-100 shadow-sm px-5 py-4">
                        <h2 className="text-sm font-semibold text-slate-900 mb-1">Budget overview</h2>
                        <p className="text-xs text-slate-500 mb-3">
                            Plan vs actual for this month. (Hook this up to your real chart later.)
                        </p>
                        <div className="h-40 flex items-center justify-center text-xs text-slate-400">
                            Budget chart placeholder
                        </div>
                    </div>

                    <div className="rounded-3xl bg-white/80 border border-slate-100 shadow-sm px-5 py-4">
                        <h2 className="text-sm font-semibold text-slate-900 mb-1">Upcoming bills</h2>
                        <p className="text-xs text-slate-500 mb-3">
                            Next important expenses so nothing sneaks up on you.
                        </p>
                        <div className="space-y-2 text-xs text-slate-700">
                            {/* Replace with real data later */}
                            <div className="flex justify-between">
                                <span>Rent</span>
                                <span>25 Nov – 8 500 kr</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Electricity</span>
                                <span>28 Nov – 600 kr</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Insurance</span>
                                <span>30 Nov – 450 kr</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: goals, emergency fund, next steps */}
                <div className="space-y-4">
                    <div className="rounded-3xl bg-white/80 border border-slate-100 shadow-sm px-5 py-4">
                        <h2 className="text-sm font-semibold text-slate-900 mb-2">Goals</h2>
                        <p className="text-xs text-slate-500 mb-3">
                            A quick snapshot of how your main goals are doing.
                        </p>
                        <div className="space-y-2 text-xs text-slate-700">
                            <div>
                                <div className="flex justify-between mb-0.5">
                                    <span>Emergency fund</span>
                                    <span>65 %</span>
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
                        title="Keep your journey going"
                        description="You&apos;re on track – review your wizard once a month to keep your plan aligned with reality."
                        ctaLabel="Open the wizard"
                        onClick={onOpenWizard}
                    />

                    <PlayfulBirdCard
                        title="Add this week&apos;s transactions"
                        description="Logging today&apos;s spending takes less than a minute and gives you way better decisions tomorrow."
                        ctaLabel="Add spending"
                        onClick={() => navigate('/expenses')}
                    />
                </div>
            </div>
        </div>
    );
};

export default ReturningDashboardSection;
