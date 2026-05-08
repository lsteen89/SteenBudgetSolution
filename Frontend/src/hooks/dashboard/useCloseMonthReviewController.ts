import { useCallback, useMemo, useState } from "react";

import { toApiProblem } from "@/api/toApiProblem";
import { useCloseBudgetMonthMutation } from "@/hooks/budget/useCloseBudgetMonthMutation";
import type {
  CloseMonthCarryOverMode,
  CloseMonthPendingOptions,
  CloseMonthReviewState,
} from "@/hooks/dashboard/closeMonth.types";
import type { DashboardSummary } from "@/hooks/dashboard/dashboardSummary.types";
import { resolveCloseMonthReviewState } from "@/hooks/dashboard/resolveCloseMonthReviewState";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { useBudgetMonthStore } from "@/stores/Budget/budgetMonthStore";
import { useToast } from "@/ui/toast/toast";
import { toUserMessage } from "@/utils/i18n/apiErrors/toUserMessage";
import { closeMonthReviewModalDict } from "@/utils/i18n/pages/private/dashboard/closeMonth/CloseMonthReviewModal.i18n";
import { tDict } from "@/utils/i18n/translate";

type UseCloseMonthReviewControllerArgs = {
  yearMonth?: string;
  summary: DashboardSummary;
};

function getPeriodLabel(yearMonth: string | undefined, locale: string) {
  if (!yearMonth) return "";

  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return "";

  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function getNextPeriodLabel(yearMonth: string | undefined, locale: string) {
  if (!yearMonth) return "";

  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return "";

  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));
}

function getPeriodMonthOnlyLabel(
  yearMonth: string | undefined,
  locale: string,
) {
  if (!yearMonth) return "";

  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return "";

  return new Intl.DateTimeFormat(locale, {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function resolveCarryOverMode(
  reviewState: CloseMonthReviewState,
  pendingOptions: CloseMonthPendingOptions,
): CloseMonthPendingOptions["carryOverMode"] {
  if (
    reviewState.state === "positiveRemaining" &&
    pendingOptions.carryOverMode === "full"
  ) {
    return "full";
  }

  return "none";
}

export function useCloseMonthReviewController({
  yearMonth,
  summary,
}: UseCloseMonthReviewControllerArgs) {
  const locale = useAppLocale();
  const toast = useToast();
  const setSelectedYearMonth = useBudgetMonthStore(
    (state) => state.setSelectedYearMonth,
  );
  const { mutateAsync: closeBudgetMonth, isPending: isSubmitting } =
    useCloseBudgetMonthMutation();

  const t = useCallback(
    <K extends keyof typeof closeMonthReviewModalDict.sv>(key: K) =>
      tDict(key, locale, closeMonthReviewModalDict),
    [locale],
  );

  const [isOpen, setIsOpen] = useState(false);
  const [pendingOptions, setPendingOptions] =
    useState<CloseMonthPendingOptions>({
      carryOverMode: "none",
    });

  const reviewState: CloseMonthReviewState = useMemo(
    () =>
      resolveCloseMonthReviewState({
        remainingToSpend: summary.remainingToSpend,
      }),
    [summary.remainingToSpend],
  );

  const nextPeriodLabel = useMemo(
    () => getNextPeriodLabel(yearMonth, locale),
    [yearMonth, locale],
  );

  const periodMonthOnlyLabel = useMemo(
    () => getPeriodMonthOnlyLabel(yearMonth, locale),
    [yearMonth, locale],
  );

  const open = useCallback(() => {
    setPendingOptions({ carryOverMode: "none" });
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    if (isSubmitting) return;
    setIsOpen(false);
  }, [isSubmitting]);

  const selectCarryOverMode = useCallback((mode: CloseMonthCarryOverMode) => {
    setPendingOptions({ carryOverMode: mode });
  }, []);

  const confirm = useCallback(async () => {
    if (!yearMonth || isSubmitting) return;

    try {
      const result = await closeBudgetMonth({
        yearMonth,
        request: {
          carryOverMode: resolveCarryOverMode(reviewState, pendingOptions),
        },
      });

      setSelectedYearMonth(result.nextMonth.yearMonth);
      setIsOpen(false);

      toast.success(
        t("closeMonthSuccessToast").replace(
          "{month}",
          getPeriodLabel(result.nextMonth.yearMonth, locale) ||
            result.nextMonth.yearMonth,
        ),
        {
          id: `dashboard:close-month:${yearMonth}:success`,
        },
      );
    } catch (error) {
      toast.error(toUserMessage(toApiProblem(error), locale), {
        id: `dashboard:close-month:${yearMonth}:error`,
      });
    }
  }, [
    closeBudgetMonth,
    isSubmitting,
    locale,
    pendingOptions,
    reviewState,
    setSelectedYearMonth,
    t,
    toast,
    yearMonth,
  ]);

  return {
    isOpen,
    isSubmitting,
    reviewState,
    nextPeriodLabel,
    periodMonthOnlyLabel,
    selectedCarryOverMode: pendingOptions.carryOverMode,
    open,
    close,
    confirm,
    selectCarryOverMode,
  };
}
