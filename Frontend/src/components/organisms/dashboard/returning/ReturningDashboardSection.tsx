import type {
  DashboardBreakdown,
  DashboardSummary,
} from "@/hooks/dashboard/dashboardSummary.types";
import { getCloseAvailabilityLabel } from "@/hooks/dashboard/getCloseAvailabilityLabel";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { BudgetDashboardMonthDto } from "@/types/budget/BudgetDashboardMonthDto";
import React from "react";

import MoneyState from "./openMonth/MoneyState";
import OpenMonthFollowUpStrip from "./openMonth/OpenMonthFollowUpStrip";
import OpenMonthPillarWorkbench from "./openMonth/OpenMonthPillarWorkbench";

export interface ReturningDashboardSectionProps {
  onOpenPeriodEditor: () => void;
  onOpenFullExpenseEditor: () => void;
  onOpenIncomeEditor: () => void;
  onOpenFullIncomeEditor: () => void;
  onOpenSavingsEditor: () => void;
  onOpenFullSavingsEditor: () => void;
  onOpenDebtsEditor: () => void;
  onOpenFullDebtsEditor: () => void;
  isSwitchingMonth?: boolean;
  summary: DashboardSummary;
  breakdown: DashboardBreakdown;
  /**
   * Raw dashboard month DTO. MoneyState consumes it directly to run the
   * P0 six-term aggregator/reconciliation against backend-authoritative
   * totals (rather than re-deriving them from the flattened summary).
   */
  dashboardMonth: BudgetDashboardMonthDto;
}

const ReturningDashboardSection: React.FC<ReturningDashboardSectionProps> = ({
  onOpenPeriodEditor,
  onOpenFullExpenseEditor,
  onOpenIncomeEditor,
  onOpenFullIncomeEditor,
  onOpenSavingsEditor,
  onOpenFullSavingsEditor,
  onOpenDebtsEditor,
  onOpenFullDebtsEditor,
  isSwitchingMonth = false,
  summary,
  breakdown,
  dashboardMonth,
}) => {
  const locale = useAppLocale();
  const closeAvailability = getCloseAvailabilityLabel(summary.header, locale);

  return (
    <div className="space-y-6">
      <MoneyState
        dashboardMonth={dashboardMonth}
        currency={summary.currency}
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
          <OpenMonthFollowUpStrip
            summary={summary}
            closeAvailability={closeAvailability}
          />
        </div>

        <div
          className={cn(
            "transition-opacity duration-250 ease-out",
            isSwitchingMonth && "opacity-90",
          )}
        >
          <OpenMonthPillarWorkbench
            summary={summary}
            breakdown={breakdown}
            dashboardMonth={dashboardMonth}
            onOpenPeriodEditor={onOpenPeriodEditor}
            onOpenFullExpenseEditor={onOpenFullExpenseEditor}
            onOpenIncomeEditor={onOpenIncomeEditor}
            onOpenFullIncomeEditor={onOpenFullIncomeEditor}
            onOpenSavingsEditor={onOpenSavingsEditor}
            onOpenFullSavingsEditor={onOpenFullSavingsEditor}
            onOpenDebtsEditor={onOpenDebtsEditor}
            onOpenFullDebtsEditor={onOpenFullDebtsEditor}
          />
        </div>
      </div>
    </div>
  );
};

export default ReturningDashboardSection;
