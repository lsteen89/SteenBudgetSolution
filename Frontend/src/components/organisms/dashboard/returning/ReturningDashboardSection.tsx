import type { DashboardSummary } from "@/hooks/dashboard/dashboardSummary.types";
import React from "react";

import BudgetOverviewCard from "./BudgetOverviewCard";
import GoalsCard from "./GoalsCard";
import KpiRow from "./KpiRow";
import NextStepsCards from "./NextStepsCards";
import RecurringExpensesCard from "./RecurringExpensesCard";
import ReturningHeader from "./ReturningHeader";
import SubscriptionsCard from "./SubscriptionsCard";

export interface ReturningDashboardSectionProps {
  onOpenWizard: () => void;
  onAdvancePeriod?: () => void;
  onGoPreviousPeriod?: () => void;
  onGoNextPeriod?: () => void;
  summary: DashboardSummary;
}

const ReturningDashboardSection: React.FC<ReturningDashboardSectionProps> = ({
  onOpenWizard,
  onAdvancePeriod,
  onGoPreviousPeriod,
  onGoNextPeriod,
  summary,
}) => {
  return (
    <div className="w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-4">
        <ReturningHeader
          periodLabel={summary.header.periodLabel}
          periodDateRangeLabel={summary.header.periodDateRangeLabel}
          periodStatus={summary.header.periodStatus}
          previousPeriodLabel={summary.header.previousPeriodLabel}
          nextPeriodLabel={summary.header.nextPeriodLabel}
          canGoPrevious={summary.header.canGoPrevious}
          canGoNext={summary.header.canGoNext}
          onGoPrevious={onGoPreviousPeriod}
          onGoNext={onGoNextPeriod}
          remainingToSpend={summary.remainingToSpend}
          currency={summary.currency}
          lifecycleState={summary.header.lifecycleState}
          noticeText={summary.header.noticeText}
          canAdvancePeriod={summary.header.canAdvancePeriod}
          advanceButtonLabel={summary.header.advanceButtonLabel}
          onAdvancePeriod={onAdvancePeriod}
          onOpenWizard={onOpenWizard}
        />

        <KpiRow
          remainingToSpend={summary.remainingToSpend}
          currency={summary.currency}
          goalsProgressPercent={summary.goalsProgressPercent}
          emergencyFundAmount={summary.emergencyFundAmount}
          emergencyFundMonths={summary.emergencyFundMonths}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <BudgetOverviewCard
            currency={summary.currency}
            totalIncome={summary.totalIncome}
            totalExpenditure={summary.totalExpenditure}
            totalSavings={summary.totalSavings}
            totalDebtPayments={summary.totalDebtPayments}
            remainingToSpend={summary.remainingToSpend}
            finalBalance={summary.finalBalance}
          />

          <div className="space-y-4">
            <RecurringExpensesCard
              currency={summary.currency}
              recurringExpenses={summary.recurringExpenses}
            />

            <SubscriptionsCard
              currency={summary.currency}
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
