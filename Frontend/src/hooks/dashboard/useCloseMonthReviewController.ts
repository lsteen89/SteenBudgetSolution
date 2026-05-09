import { useCallback, useEffect, useMemo, useState } from "react";

import { toApiProblem } from "@/api/toApiProblem";
import { useCloseBudgetMonthMutation } from "@/hooks/budget/useCloseBudgetMonthMutation";
import type {
  CloseMonthCarryOverMode,
  CloseMonthPendingOptions,
  CloseMonthReviewState,
  JustClosedMonthState,
} from "@/hooks/dashboard/closeMonth.types";
import type { DashboardSummary } from "@/hooks/dashboard/dashboardSummary.types";
import { resolveCloseMonthReviewState } from "@/hooks/dashboard/resolveCloseMonthReviewState";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { useBudgetMonthStore } from "@/stores/Budget/budgetMonthStore";
import { useToast } from "@/ui/toast/toast";
import { toUserMessage } from "@/utils/i18n/apiErrors/toUserMessage";

type UseCloseMonthReviewControllerArgs = {
  yearMonth?: string;
  summary: DashboardSummary;
};

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

  const [isOpen, setIsOpen] = useState(false);
  const [pendingOptions, setPendingOptions] =
    useState<CloseMonthPendingOptions>({
      carryOverMode: "none",
    });
  const [justClosed, setJustClosed] = useState<JustClosedMonthState | null>(
    null,
  );

  // Auto-clear the handoff when the user navigates away from the closed
  // month (e.g. via the period rail, archive, or browser back). The card is
  // strictly a one-time acknowledgement on the closed month it was raised on.
  useEffect(() => {
    if (justClosed && yearMonth && yearMonth !== justClosed.closedYearMonth) {
      setJustClosed(null);
    }
  }, [justClosed, yearMonth]);

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

    const submittedCarryOverMode = resolveCarryOverMode(
      reviewState,
      pendingOptions,
    );

    try {
      const result = await closeBudgetMonth({
        yearMonth,
        request: {
          carryOverMode: submittedCarryOverMode,
        },
      });

      // Land on the just-closed recap rather than jumping straight to the next
      // open month. The transient handoff card on that recap acknowledges the
      // close and offers a calm "continue to {nextMonth}" CTA.
      setJustClosed({
        closedYearMonth: result.closedMonth.yearMonth,
        nextYearMonth: result.nextMonth.yearMonth,
        finalBalance: result.snapshotTotals.finalBalanceMonthly,
        carryOverMode: submittedCarryOverMode,
        carryOverAmount: result.nextMonth.carryOverAmount ?? 0,
      });
      setSelectedYearMonth(result.closedMonth.yearMonth);
      setIsOpen(false);
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
    toast,
    yearMonth,
  ]);

  const continueToNextMonth = useCallback(() => {
    if (!justClosed) return;
    setSelectedYearMonth(justClosed.nextYearMonth);
    setJustClosed(null);
  }, [justClosed, setSelectedYearMonth]);

  const dismissJustClosed = useCallback(() => {
    setJustClosed(null);
  }, []);

  return {
    isOpen,
    isSubmitting,
    reviewState,
    nextPeriodLabel,
    periodMonthOnlyLabel,
    selectedCarryOverMode: pendingOptions.carryOverMode,
    justClosed,
    open,
    close,
    confirm,
    selectCarryOverMode,
    continueToNextMonth,
    dismissJustClosed,
  };
}
