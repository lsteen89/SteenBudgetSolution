import type {
  DashboardBreakdown,
  DashboardSummary,
} from "@/hooks/dashboard/dashboardSummary.types";
import { getCloseAvailabilityLabel } from "@/hooks/dashboard/getCloseAvailabilityLabel";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { BudgetDashboardMonthDto } from "@/types/budget/BudgetDashboardMonthDto";
import React from "react";

import type { AttentionPillar } from "@/domain/budget/attentionRanking";
import AttentionLane from "./openMonth/AttentionLane";
import CloseBand from "./openMonth/CloseBand";
import MoneyState from "./openMonth/MoneyState";
import OpenMonthPillarWorkbench from "./openMonth/OpenMonthPillarWorkbench";
import PlanningRow from "./openMonth/PlanningRow";

export interface ReturningDashboardSectionProps {
  onOpenPeriodEditor: () => void;
  onOpenFullExpenseEditor: () => void;
  onOpenIncomeEditor: () => void;
  onOpenFullIncomeEditor: () => void;
  onOpenSavingsEditor: () => void;
  onOpenFullSavingsEditor: () => void;
  onOpenDebtsEditor: () => void;
  onOpenFullDebtsEditor: () => void;
  /**
   * Open the close-month review modal. Routed to from the AttentionLane's
   * close-flow items (overdue, eligible) so the lane can trigger the same
   * flow the MonthRail close CTA already drives.
   */
  onOpenCloseMonth: () => void;
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
  onOpenCloseMonth,
  isSwitchingMonth = false,
  summary,
  breakdown,
  dashboardMonth,
}) => {
  const locale = useAppLocale();
  const closeAvailability = getCloseAvailabilityLabel(summary.header, locale);

  // AttentionLane routes its action chips to the same drawers/editors the
  // PillarWorkbench already uses, so we reuse those handlers verbatim. This
  // keeps "quick adjust" and "edit all" boundaries honest — the lane never
  // implies actions outside what the existing pillar surface supports.
  const handleAttentionQuickDrawer = (pillar: AttentionPillar) => {
    switch (pillar) {
      case "income":
        onOpenIncomeEditor();
        return;
      case "expenses":
        onOpenPeriodEditor();
        return;
      case "savings":
        onOpenSavingsEditor();
        return;
      case "debts":
        onOpenDebtsEditor();
        return;
    }
  };

  const handleAttentionFullEditor = (pillar: AttentionPillar) => {
    switch (pillar) {
      case "income":
        onOpenFullIncomeEditor();
        return;
      case "expenses":
        onOpenFullExpenseEditor();
        return;
      case "savings":
        onOpenFullSavingsEditor();
        return;
      case "debts":
        onOpenFullDebtsEditor();
        return;
    }
  };

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
        {/*
          PlanningRow (next-month MVP PR3) teaches the budget model — this
          month → next month → budget plan — directly under the MoneyState
          hero. It carries the single "Review next month" CTA to the read-only
          preview page. The AttentionLane below is intentionally untouched.
        */}
        <div
          className={cn(
            "transition-opacity duration-250 ease-out",
            isSwitchingMonth && "opacity-90",
          )}
        >
          <PlanningRow
            fromYearMonth={summary.header.periodKey}
            remainingToSpend={summary.remainingToSpend}
            periodLabel={summary.header.periodLabel}
            currency={summary.currency}
          />
        </div>

        {/*
          CloseBand (PR5) sits between MoneyState and AttentionLane per the
          locked Spine section order. It self-suppresses (returns null) when
          the lifecycle is calm/normal with no countdown yet — so the calm
          flow stays visually unchanged for healthy mid-month dashboards.
        */}
        <div
          className={cn(
            "transition-opacity duration-250 ease-out",
            isSwitchingMonth && "opacity-90",
          )}
        >
          <CloseBand
            summary={summary}
            closeAvailability={closeAvailability}
            onOpenCloseMonth={onOpenCloseMonth}
          />
        </div>

        <div
          className={cn(
            "transition-opacity duration-250 ease-out",
            isSwitchingMonth && "opacity-90",
          )}
        >
          <AttentionLane
            summary={summary}
            closeAvailability={closeAvailability}
            onCloseMonth={onOpenCloseMonth}
            onOpenQuickDrawer={handleAttentionQuickDrawer}
            onOpenFullEditor={handleAttentionFullEditor}
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
