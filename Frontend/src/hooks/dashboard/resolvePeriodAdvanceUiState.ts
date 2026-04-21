import type { AppLocale } from "@/types/i18n/appLocale";
import type { BudgetDashboardMonthDto } from "@myTypes/budget/BudgetDashboardMonthDto";

import { dashboardSummaryDict } from "@/utils/i18n/pages/private/dashboard/pages/dashboardSummaryDict.i18n";
import { tDict } from "@/utils/i18n/translate";

import type {
  DashboardPeriodHeaderSummary,
  HeaderLifecycleState,
} from "./dashboardSummary.types";

type PeriodAdvanceUiState = Pick<
  DashboardPeriodHeaderSummary,
  "lifecycleState" | "canAdvancePeriod" | "advanceButtonLabel" | "noticeText"
>;

export function resolvePeriodAdvanceUiState(
  month: BudgetDashboardMonthDto["month"],
  locale: AppLocale,
): PeriodAdvanceUiState {
  const t = <K extends keyof typeof dashboardSummaryDict.sv>(key: K) =>
    tDict(key, locale, dashboardSummaryDict);

  if (month.status !== "open") {
    return buildState("normal", false, null, null);
  }

  if (month.isOverdueForClose) {
    return buildState(
      "overdue",
      true,
      t("closeMonthCta"),
      t("closeMonthOverdueNotice"),
    );
  }

  if (month.isCloseWindowOpen) {
    return buildState(
      "eligible",
      true,
      t("closeMonthCta"),
      t("closeMonthEligibleNotice"),
    );
  }

  return buildState("normal", false, null, null);
}

function buildState(
  lifecycleState: HeaderLifecycleState,
  canAdvancePeriod: boolean,
  advanceButtonLabel: string | null,
  noticeText: string | null,
): PeriodAdvanceUiState {
  return {
    lifecycleState,
    canAdvancePeriod,
    advanceButtonLabel,
    noticeText,
  };
}
