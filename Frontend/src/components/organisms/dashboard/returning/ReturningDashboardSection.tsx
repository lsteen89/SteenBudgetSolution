import React from "react";
import type { NavigateFunction } from "react-router-dom";
import type { DashboardSummary } from "@/hooks/dashboard/dashboardSummary.types";

import ReturningHeader from "./ReturningHeader";
import KpiRow from "./KpiRow";
import BudgetOverviewCard from "./BudgetOverviewCard";
import RecurringExpensesCard from "./RecurringExpensesCard";
import SubscriptionsCard from "./SubscriptionsCard";
import GoalsCard from "./GoalsCard";
import NextStepsCards from "./NextStepsCards";

export interface ReturningDashboardSectionProps {
    onOpenWizard: () => void;
    summary: DashboardSummary;
}

const ReturningDashboardSection: React.FC<ReturningDashboardSectionProps> = ({ onOpenWizard, summary }) => {
    return (
        <div className="w-full max-w-6xl space-y-6">
            <div className="flex flex-col gap-4">
                <ReturningHeader
                    monthLabel={summary.monthLabel}
                    remainingToSpend={summary.remainingToSpend}
                    currency={summary.remainingCurrency}
                    onOpenWizard={onOpenWizard}
                />

                <KpiRow
                    remainingToSpend={summary.remainingToSpend}
                    currency={summary.remainingCurrency}
                    goalsProgressPercent={summary.goalsProgressPercent}
                    emergencyFundAmount={summary.emergencyFundAmount}
                    emergencyFundMonths={summary.emergencyFundMonths}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                    <BudgetOverviewCard
                        currency={summary.remainingCurrency}
                        totalIncome={summary.totalIncome}
                        totalExpenditure={summary.totalExpenditure}
                        totalSavings={summary.totalSavings}
                        totalDebtPayments={summary.totalDebtPayments}
                        remainingToSpend={summary.remainingToSpend}
                        finalBalance={summary.finalBalance}
                    />

                    <div className="space-y-4">
                        <RecurringExpensesCard
                            currency={summary.remainingCurrency}
                            recurringExpenses={summary.recurringExpenses}
                        />

                        <SubscriptionsCard
                            currency={summary.remainingCurrency}
                            subscriptionsTotal={summary.subscriptionsTotal}
                            subscriptionsCount={summary.subscriptionsCount}
                            subscriptions={summary.subscriptions}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <GoalsCard
                        description={summary.pillarDescriptions.savings}
                        goalsProgressPercent={summary.goalsProgressPercent}
                    />
                    <NextStepsCards onOpenWizard={onOpenWizard} />
                </div>
            </div>
        </div>
    );
};

export default ReturningDashboardSection;
