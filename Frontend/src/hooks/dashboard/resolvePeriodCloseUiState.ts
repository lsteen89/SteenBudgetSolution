import type { AppLocale } from "@/types/i18n/appLocale";
import type { BudgetDashboardMonthDto } from "@myTypes/budget/BudgetDashboardMonthDto";

import { dashboardSummaryDict } from "@/utils/i18n/pages/private/dashboard/pages/dashboardSummaryDict.i18n";
import { tDict } from "@/utils/i18n/translate";

import type {
  DashboardPeriodHeaderSummary,
  HeaderLifecycleState,
} from "./dashboardSummary.types";

type PeriodCloseUiState = Pick<
  DashboardPeriodHeaderSummary,
  "lifecycleState" | "canCloseMonth" | "closeMonthButtonLabel" | "noticeText"
>;

const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;

export function resolvePeriodCloseUiState(
  month: BudgetDashboardMonthDto["month"],
  locale: AppLocale,
  now: Date = new Date(),
): PeriodCloseUiState {
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

  if (isUpcoming(month.closeWindowOpensAtUtc, now)) {
    return buildState(
      "upcoming",
      false,
      null,
      t("closeMonthUpcomingNotice"),
    );
  }

  return buildState("normal", false, null, null);
}

function isUpcoming(closeWindowOpensAtUtc: string | null, now: Date) {
  if (!closeWindowOpensAtUtc) {
    return false;
  }

  const openTime = new Date(closeWindowOpensAtUtc);
  const timeUntilOpen = openTime.getTime() - now.getTime();

  return timeUntilOpen >= 0 && timeUntilOpen <= THREE_DAYS_IN_MS;
}

function buildState(
  lifecycleState: HeaderLifecycleState,
  canCloseMonth: boolean,
  closeMonthButtonLabel: string | null,
  noticeText: string | null,
): PeriodCloseUiState {
  return {
    lifecycleState,
    canCloseMonth,
    closeMonthButtonLabel,
    noticeText,
  };
}
