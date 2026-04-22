import { useCallback, useMemo, useState } from "react";

import { toApiProblem } from "@/api/toApiProblem";
import { useCloseBudgetMonthMutation } from "@/hooks/budget/useCloseBudgetMonthMutation";
import type {
  CloseMonthPendingOptions,
  CloseMonthReviewState,
  SurplusResolutionStatus,
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
  onOpenPeriodEditor: () => void;
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
  onOpenPeriodEditor,
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

  const surplusResolutionStatus: SurplusResolutionStatus = useMemo(() => {
    if (reviewState.state !== "positiveRemaining") return "idle";
    if (pendingOptions.carryOverMode === "full") return "resolvedCarryOver";
    return "idle";
  }, [pendingOptions.carryOverMode, reviewState.state]);

  const open = useCallback(() => {
    setPendingOptions({ carryOverMode: "none" });
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    if (isSubmitting) return;
    setIsOpen(false);
  }, [isSubmitting]);

  const reviewMonth = useCallback(() => {
    setIsOpen(false);
    onOpenPeriodEditor();
  }, [onOpenPeriodEditor]);

  const resolveToCarryOver = useCallback(() => {
    if (reviewState.state !== "positiveRemaining") return;
    setPendingOptions({ carryOverMode: "full" });
  }, [reviewState.state]);

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
          getPeriodLabel(result.closedMonth.yearMonth, locale) ||
            result.closedMonth.yearMonth,
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
    surplusResolutionStatus,
    open,
    close,
    reviewMonth,
    confirm,
    resolveToCarryOver,
  };
}
