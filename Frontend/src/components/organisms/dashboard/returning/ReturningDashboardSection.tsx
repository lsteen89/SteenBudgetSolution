import type { DashboardSummary } from "@/hooks/dashboard/dashboardSummary.types";
import { cn } from "@/lib/utils";
import React from "react";

import BudgetOverviewCard from "./cards/BudgetOverviewCard";
import EditPeriodCard from "./cards/EditPeriodCard";
import GoalsCard from "./cards/GoalsCard";
import RecurringExpensesCard from "./cards/RecurringExpensesCard";
import SubscriptionsCard from "./cards/SubscriptionsCard";
import KpiRow from "./KpiRow";
import ReturningHeader from "./ReturningHeader";

export interface ReturningDashboardSectionProps {
  onOpenPeriodEditor: () => void;
  onCloseMonth?: () => void;
  onGoPreviousPeriod?: () => void;
  onGoNextPeriod?: () => void;
  isSwitchingMonth?: boolean;
  summary: DashboardSummary;
}

const ReturningDashboardSection: React.FC<ReturningDashboardSectionProps> = ({
  onOpenPeriodEditor,
  onCloseMonth,
  onGoPreviousPeriod,
  onGoNextPeriod,
  isSwitchingMonth = false,
  summary,
}) => {
  console.log(
    "recurringExpenses for month",
    summary.header.periodKey,
    summary.recurringExpenses,
  );
  return (
    <div className="w-full max-w-6xl space-y-6">
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
        isSwitchingMonth={isSwitchingMonth}
        remainingToSpend={summary.remainingToSpend}
        currency={summary.currency}
        lifecycleState={summary.header.lifecycleState}
        noticeText={summary.header.noticeText}
        canCloseMonth={summary.header.canCloseMonth}
        closeMonthButtonLabel={summary.header.closeMonthButtonLabel}
        onCloseMonth={onCloseMonth}
      />

      <div
        className={cn(
          "space-y-6 transition-opacity duration-250 ease-out",
          isSwitchingMonth && "opacity-75",
        )}
      >
        <div
          className={cn(
            "transition-opacity duration-250 ease-out",
            isSwitchingMonth && "opacity-90",
          )}
        >
          <KpiRow
            remainingToSpend={summary.remainingToSpend}
            currency={summary.currency}
            goalsProgressPercent={summary.goalsProgressPercent}
            emergencyFundAmount={summary.emergencyFundAmount}
            emergencyFundMonths={summary.emergencyFundMonths}
          />
        </div>

        <div
          className={cn(
            "grid grid-cols-1 gap-4 transition-opacity duration-250 ease-out lg:grid-cols-3",
            isSwitchingMonth && "pointer-events-none opacity-60",
          )}
        >
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
                yearMonth={summary.header.periodKey}
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

            <EditPeriodCard
              periodLabel={summary.header.periodLabel}
              remainingToSpend={summary.remainingToSpend}
              currency={summary.currency}
              onOpenPeriodEditor={onOpenPeriodEditor}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturningDashboardSection;
