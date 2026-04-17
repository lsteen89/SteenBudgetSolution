import type {
  BudgetPeriodStatus,
  HeaderLifecycleState,
} from "@/hooks/dashboard/dashboardSummary.types";

type GetHeaderLifecycleStateInput = {
  periodStatus: BudgetPeriodStatus;
  canAdvancePeriod: boolean;
  daysUntilEligible?: number | null;
  daysSinceEligible?: number | null;
};

export function getHeaderLifecycleState({
  periodStatus,
  canAdvancePeriod,
  daysUntilEligible,
  daysSinceEligible,
}: GetHeaderLifecycleStateInput): HeaderLifecycleState {
  if (periodStatus !== "open") return "normal";

  if (canAdvancePeriod) {
    if ((daysSinceEligible ?? 0) >= 3) return "overdue";
    return "eligible";
  }

  if (
    daysUntilEligible !== null &&
    daysUntilEligible !== undefined &&
    daysUntilEligible >= 0 &&
    daysUntilEligible <= 3
  ) {
    return "upcoming";
  }

  return "normal";
}
