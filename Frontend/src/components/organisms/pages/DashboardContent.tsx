import CloseMonthReviewModal from "@/components/organisms/dashboard/closeMonth/CloseMonthReviewModal";
import ClosedMonthHandoffCard from "@/components/organisms/dashboard/closeMonth/ClosedMonthHandoffCard";
import EditPeriodDrawer from "@/components/organisms/dashboard/editPeriod/EditPeriodDrawer";
import ClosedMonthRecapSection from "@/components/organisms/dashboard/recap/ClosedMonthRecapSection";
import SkippedMonthState from "@/components/organisms/dashboard/recap/SkippedMonthState";
import ReturningDashboardSection from "@/components/organisms/dashboard/returning/ReturningDashboardSection";
import PeriodControlBar, {
  type PeriodControlBarViewModel,
} from "@/components/organisms/dashboard/shell/PeriodControlBar";
import type { PeriodActionSlotViewModel } from "@/components/organisms/dashboard/shell/PeriodActionSlot";
import { useBudgetMonthRecapQuery } from "@/hooks/budget/useBudgetMonthRecapQuery";
import { useCloseMonthReviewController } from "@/hooks/dashboard/useCloseMonthReviewController";
import { useDashboardSummary } from "@/hooks/dashboard/useDashboardSummary";
import type { DashboardSummary } from "@/hooks/dashboard/dashboardSummary.types";
import {
  getCloseAvailabilityLabel,
  type CloseAvailability,
} from "@/hooks/dashboard/getCloseAvailabilityLabel";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { useBudgetMonthStore } from "@/stores/Budget/budgetMonthStore";
import type { ApiProblem } from "@/api/api.types";
import type { AppLocale } from "@/types/i18n/appLocale";
import type { BudgetMonthListItemDto } from "@/types/budget/BudgetMonthsStatusDto";
import { dashboardHeaderDict } from "@/utils/i18n/pages/private/dashboard/header/DashboardHeader.i18n";
import { closeMonthReviewModalDict } from "@/utils/i18n/pages/private/dashboard/closeMonth/CloseMonthReviewModal.i18n";
import { dashboardErrorStateDict } from "@/utils/i18n/pages/private/dashboard/DashboardErrorState.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import DashboardHomeSkeleton from "@components/organisms/dashboard/DashboardHomeSkeleton";
import FirstTimeDashboardSection from "@components/organisms/dashboard/FirstTimeDashboardSection";
import React, { useCallback, useState } from "react";
import DashboardErrorState from "../dashboard/DashboardErrorState";

export interface DashboardContentProps {
  isFirstTimeLogin: boolean;
  isWizardOpen: boolean;
  setIsWizardOpen: (open: boolean) => void;
}

const isNotFound = (p: any) =>
  p?.status === 404 || p?.statusCode === 404 || p?.httpStatus === 404;

const isNetworkDashboardError = (error: ApiProblem | null) => {
  const raw = error?.raw as { message?: unknown } | undefined;
  const rawMessage = typeof raw?.message === "string" ? raw.message : "";

  return (
    error?.isNetworkError === true ||
    error?.message === "Network Error" ||
    rawMessage === "Network Error"
  );
};

type HeaderTKey = keyof typeof dashboardHeaderDict.sv;
type HeaderT = <K extends HeaderTKey>(key: K) => string;
type CloseReviewTKey = keyof typeof closeMonthReviewModalDict.sv;
type CloseReviewT = <K extends CloseReviewTKey>(key: K) => string;

function replaceToken(template: string, token: string, value: string) {
  return template.replace(`{${token}}`, value);
}

function buildPeriodControlBarViewModel(
  summary: DashboardSummary,
  locale: AppLocale,
  options: {
    closeAvailability?: CloseAvailability;
    suppressContinueAction?: boolean;
  } = {},
): PeriodControlBarViewModel {
  const t: HeaderT = (key) => tDict(key, locale, dashboardHeaderDict);
  const header = summary.header;
  const isSkipped = header.periodStatus === "skipped";
  const isClosed = header.periodStatus === "closed";
  const isAttention =
    header.periodStatus === "open" && header.lifecycleState === "overdue";
  const showCloseAction =
    header.periodStatus === "open" &&
    header.canCloseMonth &&
    !!header.closeMonthButtonLabel;
  const closeAvailability = options.closeAvailability;
  const isReadyToClose =
    header.periodStatus === "open" && closeAvailability?.kind === "ready";
  // Open + ready (eligible) replaces the bland "Open" chip with a calmer
  // "Ready to close" label so the user sees the next step at a glance.
  // Overdue keeps its dedicated "overdue" chip + amber tone — that's a
  // different urgency signal.
  const statusLabelKey = isAttention
    ? "overdue"
    : isReadyToClose
      ? "readyToClose"
      : header.periodStatus;
  const currentTone: PeriodControlBarViewModel["current"]["tone"] = isSkipped
    ? "muted"
    : isClosed
      ? "success"
      : isAttention
        ? "attention"
        : "success";
  const comparisonLabel =
    showCloseAction || isAttention
      ? t("periodContextOverdueComparison")
      : isClosed
        ? t("periodContextClosedComparison")
        : isSkipped
          ? t("periodContextSkippedComparison")
          : t("periodContextOpenComparison");
  const nextLabel =
    header.nextPeriodLabel && (header.canGoNext || isClosed || isSkipped)
      ? replaceToken(
          t("periodContextNextAvailable"),
          "month",
          header.nextPeriodLabel,
        )
      : t("periodContextNextLocked");

  const ribbonItems: PeriodControlBarViewModel["ribbonItems"] = [
    {
      label: isSkipped
        ? t("periodContextSkippedMeaning")
        : isClosed
          ? t("periodContextClosedMeaning")
          : isAttention || showCloseAction
            ? t("periodContextOverdueMeaning")
            : t("periodContextOpenMeaning"),
      tone: currentTone,
      icon: isSkipped ? "skip" : isClosed ? "lock" : "status",
    },
    ...(isClosed
      ? []
      : [
          {
            label: comparisonLabel,
            tone: isAttention ? "attention" : isSkipped ? "muted" : "neutral",
            icon: "compare",
          } satisfies PeriodControlBarViewModel["ribbonItems"][number],
        ]),
    {
      label: nextLabel,
      tone: header.canGoNext ? "neutral" : "muted",
      icon: "next",
    },
    // Open-not-yet-closable months get a calm "Månaden kan stängas om X dagar"
    // chip after the next-month chip. Ready-to-close months don't need this
    // — the status chip itself flips to "Redo att stängas" and the close CTA
    // handles the rest.
    ...(closeAvailability?.kind === "countdown"
      ? [
          {
            label: closeAvailability.label,
            tone: "neutral",
            icon: "status",
          } satisfies PeriodControlBarViewModel["ribbonItems"][number],
        ]
      : []),
  ];

  const previousLabel = header.previousPeriodLabel ?? t("previous");
  const nextNavLabel = header.nextPeriodLabel ?? t("next");
  const previousAriaLabel = header.previousPeriodLabel
    ? replaceToken(t("previousMonthAria"), "month", header.previousPeriodLabel)
    : t("previousMonthLockedAria");
  const nextAriaLabel = header.nextPeriodLabel
    ? replaceToken(t("nextMonthAria"), "month", header.nextPeriodLabel)
    : t("nextMonthLockedAria");

  const continueTargetLabel = header.nextPeriodLabel ?? null;
  const continueTargetKey = header.nextPeriodKey ?? null;

  let action: PeriodActionSlotViewModel;
  if (showCloseAction) {
    action = {
      type: "close",
      label: header.closeMonthButtonLabel as string,
      helperText:
        header.lifecycleState === "overdue"
          ? t("actionRequired")
          : header.lifecycleState === "eligible"
            ? t("readyToFinalize")
            : null,
      attention: header.lifecycleState === "overdue",
    };
  } else if (
    (isClosed || isSkipped) &&
    continueTargetLabel &&
    continueTargetKey &&
    !options.suppressContinueAction
  ) {
    action = {
      type: "continue",
      label: replaceToken(t("continueWithMonth"), "month", continueTargetLabel),
      ariaLabel: replaceToken(
        t("continueWithMonthAria"),
        "month",
        continueTargetLabel,
      ),
      targetYearMonth: continueTargetKey,
    };
  } else if (isSkipped) {
    action = {
      type: "passive",
      label: t("periodActionNoSnapshot"),
      tone: "muted",
    };
  } else {
    action = { type: "none" };
  }

  return {
    current: {
      yearMonth: header.periodKey,
      label: header.periodLabel,
      status: header.periodStatus,
      statusLabel: t(statusLabelKey),
      tone: currentTone,
    },
    previous: {
      label: previousLabel,
      disabled: !header.canGoPrevious,
      ariaLabel: previousAriaLabel,
    },
    next: {
      label: nextNavLabel,
      disabled: !header.canGoNext,
      ariaLabel: nextAriaLabel,
    },
    ribbonItems,
    action,
    archive: {
      triggerLabel: t("monthArchiveTrigger"),
      emptyLabel: t("monthArchiveEmpty"),
      statusLabels: {
        open: t("open"),
        closed: t("closed"),
        skipped: t("skipped"),
      },
    },
  };
}

type LoadedDashboardContentProps = {
  summary: DashboardSummary;
  isFetching: boolean;
  isPending: boolean;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  archiveMonths: BudgetMonthListItemDto[];
};

function LoadedDashboardContent({
  summary,
  isFetching,
  isPending,
  goToPreviousMonth,
  goToNextMonth,
  archiveMonths,
}: LoadedDashboardContentProps) {
  const [isPeriodEditorOpen, setIsPeriodEditorOpen] = useState(false);
  const locale = useAppLocale();
  const setSelectedYearMonth = useBudgetMonthStore(
    (s) => s.setSelectedYearMonth,
  );

  const yearMonth = summary.header.periodKey;
  const isClosedMonth = summary.header.periodStatus === "closed";
  const isSkippedMonth = summary.header.periodStatus === "skipped";
  const recapQuery = useBudgetMonthRecapQuery(yearMonth, {
    enabled: isClosedMonth,
  });

  function handleOpenPeriodEditor() {
    if (!yearMonth) return;
    setIsPeriodEditorOpen(true);
  }

  const closeMonthReview = useCloseMonthReviewController({
    yearMonth,
    summary,
  });

  const closeMonthSummary = {
    incomingCarryOver: summary.incomingCarryOverAmount,
    income: summary.totalIncome,
    expenses: summary.totalExpenditure,
    savingsAndDebt: summary.totalSavings + summary.totalDebtPayments,
    remaining: summary.remainingToSpend,
  };

  const isSwitchingMonth = isFetching && !isPending;

  // The handoff card owns the "continue to next month" CTA whenever it is
  // visible for the active selected month. Suppress the header continue
  // action so the user only sees one calm forward action at a time.
  const isJustClosedHandoffVisible =
    closeMonthReview.justClosed?.closedYearMonth === yearMonth;

  const closeAvailability = getCloseAvailabilityLabel(summary.header, locale);

  const periodControlVm = buildPeriodControlBarViewModel(summary, locale, {
    closeAvailability,
    suppressContinueAction: isJustClosedHandoffVisible,
  });

  return (
    <div className="w-full max-w-6xl space-y-5">
      <PeriodControlBar
        vm={periodControlVm}
        onGoPrevious={goToPreviousMonth}
        onGoNext={goToNextMonth}
        isSwitchingMonth={isSwitchingMonth}
        onCloseMonth={closeMonthReview.open}
        onContinueAction={setSelectedYearMonth}
        archiveMonths={archiveMonths}
        onSelectMonth={setSelectedYearMonth}
        archiveLocale={locale}
      />

      {isClosedMonth ? (
        <>
          {closeMonthReview.justClosed &&
          closeMonthReview.justClosed.closedYearMonth === yearMonth ? (
            <ClosedMonthHandoffCard
              closedMonthLabel={summary.header.periodLabel}
              nextMonthLabel={
                summary.header.nextPeriodLabel ??
                closeMonthReview.nextPeriodLabel
              }
              finalBalance={closeMonthReview.justClosed.finalBalance}
              carryOverMode={closeMonthReview.justClosed.carryOverMode}
              carryOverAmount={closeMonthReview.justClosed.carryOverAmount}
              currency={summary.currency}
              onContinue={closeMonthReview.continueToNextMonth}
              onDismiss={closeMonthReview.dismissJustClosed}
            />
          ) : null}
          <ClosedMonthRecapSection
            recap={recapQuery.data}
            currency={summary.currency}
            locale={locale}
            isLoading={recapQuery.isPending}
            errorMessage={recapQuery.error?.message}
            onRetry={() => void recapQuery.refetch()}
          />
        </>
      ) : isSkippedMonth ? (
        <SkippedMonthState
          periodLabel={summary.header.periodLabel}
          locale={locale}
          nextPeriodLabel={summary.header.nextPeriodLabel}
        />
      ) : (
        <>
          <ReturningDashboardSection
            summary={summary}
            onOpenPeriodEditor={handleOpenPeriodEditor}
            isSwitchingMonth={isSwitchingMonth}
          />

          <CloseMonthReviewModal
            open={closeMonthReview.isOpen}
            periodLabel={summary.header.periodLabel}
            periodMonthOnlyLabel={closeMonthReview.periodMonthOnlyLabel}
            nextPeriodLabel={closeMonthReview.nextPeriodLabel}
            currency={summary.currency}
            reviewState={closeMonthReview.reviewState}
            summary={closeMonthSummary}
            selectedCarryOverMode={closeMonthReview.selectedCarryOverMode}
            isSubmitting={closeMonthReview.isSubmitting}
            onClose={closeMonthReview.close}
            onConfirm={closeMonthReview.confirm}
            onSelectCarryOverMode={closeMonthReview.selectCarryOverMode}
          />

          <EditPeriodDrawer
            open={isPeriodEditorOpen}
            yearMonth={yearMonth}
            periodLabel={summary.header.periodLabel}
            periodDateRangeLabel={summary.header.periodDateRangeLabel}
            onClose={() => {
              setIsPeriodEditorOpen(false);
            }}
          />
        </>
      )}
    </div>
  );
}

const DashboardContent: React.FC<DashboardContentProps> = ({
  isFirstTimeLogin,
  isWizardOpen,
  setIsWizardOpen,
}) => {
  const [hasStartedWizardThisSession, setHasStartedWizardThisSession] =
    useState(false);
  const locale = useAppLocale();
  const tError = <K extends keyof typeof dashboardErrorStateDict.sv>(key: K) =>
    tDict(key, locale, dashboardErrorStateDict);

  const openWizard = useCallback(() => {
    setHasStartedWizardThisSession(true);
    setIsWizardOpen(true);
  }, [setIsWizardOpen]);

  const shouldFetchDashboard = !isFirstTimeLogin && !isWizardOpen;

  const {
    data,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
    goToPreviousMonth,
    goToNextMonth,
    monthsStatus,
  } = useDashboardSummary({
    enabled: shouldFetchDashboard,
  });

  const shouldShowResume = hasStartedWizardThisSession || isWizardOpen;

  if (isFirstTimeLogin) {
    return (
      <FirstTimeDashboardSection
        onStartWizard={openWizard}
        canResumeWizard={shouldShowResume}
        onResumeWizard={openWizard}
      />
    );
  }

  if (isWizardOpen) return null;

  if (isPending) return <DashboardHomeSkeleton />;

  if (isError && isNotFound(error)) {
    return (
      <FirstTimeDashboardSection
        onStartWizard={openWizard}
        canResumeWizard={shouldShowResume}
        onResumeWizard={openWizard}
      />
    );
  }

  if (isError) {
    const shouldShowErrorDetails = import.meta.env.DEV;

    return (
      <DashboardErrorState
        title={tError("title")}
        message={
          isNetworkDashboardError(error)
            ? tError("networkMessage")
            : tError("fallbackMessage")
        }
        onRetry={refetch}
        retryLabel={tError("retry")}
        reloadLabel={tError("reload")}
        detailsLabel={tError("details")}
        details={
          shouldShowErrorDetails ? JSON.stringify(error, null, 2) : undefined
        }
      />
    );
  }

  if (!data) {
    return (
      <FirstTimeDashboardSection
        onStartWizard={openWizard}
        canResumeWizard={shouldShowResume}
        onResumeWizard={openWizard}
      />
    );
  }

  return (
    <LoadedDashboardContent
      summary={data.summary}
      isFetching={isFetching}
      isPending={isPending}
      goToPreviousMonth={goToPreviousMonth}
      goToNextMonth={goToNextMonth}
      archiveMonths={monthsStatus?.months ?? []}
    />
  );
};

export default DashboardContent;
