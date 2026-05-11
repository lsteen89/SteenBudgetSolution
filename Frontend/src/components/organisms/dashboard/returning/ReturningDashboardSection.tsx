import type { DashboardSummary } from "@/hooks/dashboard/dashboardSummary.types";
import { getCloseAvailabilityLabel } from "@/hooks/dashboard/getCloseAvailabilityLabel";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import React from "react";

import OpenMonthCommandHero from "./openMonth/OpenMonthCommandHero";
import OpenMonthFollowUpStrip from "./openMonth/OpenMonthFollowUpStrip";
import OpenMonthPillarsGrid from "./openMonth/OpenMonthPillarsGrid";

export interface ReturningDashboardSectionProps {
  onOpenPeriodEditor: () => void;
  isSwitchingMonth?: boolean;
  summary: DashboardSummary;
}

const ReturningDashboardSection: React.FC<ReturningDashboardSectionProps> = ({
  onOpenPeriodEditor,
  isSwitchingMonth = false,
  summary,
}) => {
  const locale = useAppLocale();
  const closeAvailability = getCloseAvailabilityLabel(summary.header, locale);

  return (
    <div className="space-y-6">
      <OpenMonthCommandHero
        periodLabel={summary.header.periodLabel}
        finalBalance={summary.finalBalance}
        currency={summary.currency}
        closeAvailability={closeAvailability}
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
          <OpenMonthPillarsGrid
            summary={summary}
            onOpenPeriodEditor={onOpenPeriodEditor}
          />
        </div>
      </div>
    </div>
  );
};

export default ReturningDashboardSection;
