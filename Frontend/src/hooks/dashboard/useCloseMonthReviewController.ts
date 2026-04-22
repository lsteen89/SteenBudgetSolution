import { useCallback, useMemo, useState } from "react";

import type {
  CloseMonthPendingOptions,
  CloseMonthReviewState,
  RequestCloseMonthHandler,
  SurplusResolutionStatus,
} from "@/hooks/dashboard/closeMonth.types";
import { resolveCloseMonthReviewState } from "@/hooks/dashboard/resolveCloseMonthReviewState";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { useToast } from "@/ui/toast/toast";
import { closeMonthReviewModalDict } from "@/utils/i18n/pages/private/dashboard/closeMonth/CloseMonthReviewModal.i18n";
import { tDict } from "@/utils/i18n/translate";

type CloseMonthRequest = Parameters<NonNullable<RequestCloseMonthHandler>>[0];
type CloseMonthSummary = CloseMonthRequest["summary"];

type UseCloseMonthReviewControllerArgs = {
  yearMonth?: string;
  summary: CloseMonthSummary;
  onRequestCloseMonth?: RequestCloseMonthHandler;
  onOpenPeriodEditor: () => void;
};

function getNextPeriodLabel(yearMonth: string | undefined, locale: string) {
  if (!yearMonth) return "";

  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return "";

  const next = new Date(Date.UTC(year, month, 1));

  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(next);
}

export function useCloseMonthReviewController({
  yearMonth,
  summary,
  onRequestCloseMonth,
  onOpenPeriodEditor,
}: UseCloseMonthReviewControllerArgs) {
  const locale = useAppLocale();
  const toast = useToast();

  const t = useCallback(
    <K extends keyof typeof closeMonthReviewModalDict.sv>(key: K) =>
      tDict(key, locale, closeMonthReviewModalDict),
    [locale],
  );

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (!onRequestCloseMonth) {
      toast.info(t("closeMonthComingSoonToast"), {
        id: `dashboard:close-month:${yearMonth}:coming-soon`,
      });
      return;
    }

    try {
      setIsSubmitting(true);

      await onRequestCloseMonth({
        yearMonth,
        summary,
        reviewState,
        options: pendingOptions,
      });

      setIsOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    yearMonth,
    isSubmitting,
    onRequestCloseMonth,
    pendingOptions,
    reviewState,
    summary,
    t,
    toast,
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
