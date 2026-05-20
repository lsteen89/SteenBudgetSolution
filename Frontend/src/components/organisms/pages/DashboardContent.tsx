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
import type {
  DashboardBreakdown,
  DashboardSummary,
} from "@/hooks/dashboard/dashboardSummary.types";
import { getCloseAvailabilityLabel } from "@/hooks/dashboard/getCloseAvailabilityLabel";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { useBudgetMonthStore } from "@/stores/Budget/budgetMonthStore";
import type { ApiProblem } from "@/api/api.types";
import type { AppLocale } from "@/types/i18n/appLocale";
import type { BudgetMonthListItemDto } from "@/types/budget/BudgetMonthsStatusDto";
import { dashboardHeaderDict } from "@/utils/i18n/pages/private/dashboard/header/DashboardHeader.i18n";
import { closeMonthReviewModalDict } from "@/utils/i18n/pages/private/dashboard/closeMonth/CloseMonthReviewModal.i18n";
import { dashboardErrorStateDict } from "@/utils/i18n/pages/private/dashboard/DashboardErrorState.i18n";
import { tDict } from "@/utils/i18n/translate";
import DashboardHomeSkeleton from "@components/organisms/dashboard/DashboardHomeSkeleton";
import FirstTimeDashboardSection from "@components/organisms/dashboard/FirstTimeDashboardSection";
import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    suppressContinueAction?: boolean;
  } = {},
): PeriodControlBarViewModel {
  const t: HeaderT = (key) => tDict(key, locale, dashboardHeaderDict);
  const header = summary.header;
  const isSkipped = header.periodStatus === "skipped";
  const isClosed = header.periodStatus === "closed";
  const showCloseAction =
    header.periodStatus === "open" &&
    header.canCloseMonth &&
    !!header.closeMonthButtonLabel;
  const currentTone: PeriodControlBarViewModel["current"]["tone"] = isSkipped
    ? "muted"
    : isClosed
      ? "success"
      : "success";
  const comparisonLabel =
    isClosed
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
          : t("periodContextOpenMeaning"),
      tone: currentTone,
      icon: isSkipped ? "skip" : isClosed ? "lock" : "status",
    },
    ...(isClosed
      ? []
      : [
          {
            label: comparisonLabel,
            tone: isSkipped ? "muted" : "neutral",
            icon: "compare",
          } satisfies PeriodControlBarViewModel["ribbonItems"][number],
        ]),
    {
      label: nextLabel,
      tone: header.canGoNext ? "neutral" : "muted",
      icon: "next",
    },
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
      statusLabel: t(header.periodStatus),
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
  breakdown: DashboardBreakdown;
  isFetching: boolean;
  isPending: boolean;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  archiveMonths: BudgetMonthListItemDto[];
};

function LoadedDashboardContent({
  summary,
  breakdown,
  isFetching,
  isPending,
  goToPreviousMonth,
  goToNextMonth,
  archiveMonths,
}: LoadedDashboardContentProps) {
  const [isPeriodEditorOpen, setIsPeriodEditorOpen] = useState(false);
  const [periodEditorPanel, setPeriodEditorPanel] = useState<
    "expenses" | "income" | "savings" | "debts"
  >("expenses");
  const locale = useAppLocale();
  const navigate = useNavigate();
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
    setPeriodEditorPanel("expenses");
    setIsPeriodEditorOpen(true);
  }

  function handleOpenIncomeEditor() {
    if (!yearMonth) return;
    setPeriodEditorPanel("income");
    setIsPeriodEditorOpen(true);
  }

  function handleOpenSavingsEditor() {
    if (!yearMonth) return;
    setPeriodEditorPanel("savings");
    setIsPeriodEditorOpen(true);
  }

  function handleOpenDebtsEditor() {
    if (!yearMonth) return;
    setPeriodEditorPanel("debts");
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
            breakdown={breakdown}
            onOpenPeriodEditor={handleOpenPeriodEditor}
            onOpenFullExpenseEditor={() => navigate("/dashboard/expenses")}
            onOpenIncomeEditor={handleOpenIncomeEditor}
            onOpenFullIncomeEditor={() => navigate("/dashboard/income")}
            onOpenSavingsEditor={handleOpenSavingsEditor}
            onOpenFullSavingsEditor={() => navigate("/dashboard/savings")}
            onOpenDebtsEditor={handleOpenDebtsEditor}
            onOpenFullDebtsEditor={() => navigate("/dashboard/debts")}
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
            completionCandidates={closeMonthReview.completionCandidates}
            selectedCompletionGoalIds={closeMonthReview.selectedCompletionGoalIds}
            onToggleCompletionGoal={closeMonthReview.toggleCompletionGoal}
            onClose={closeMonthReview.close}
            onConfirm={closeMonthReview.confirm}
            onSelectCarryOverMode={closeMonthReview.selectCarryOverMode}
          />

          <EditPeriodDrawer
            open={isPeriodEditorOpen}
            yearMonth={yearMonth}
            periodLabel={summary.header.periodLabel}
            periodDateRangeLabel={summary.header.periodDateRangeLabel}
            panel={periodEditorPanel}
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
      breakdown={data.breakdown}
      isFetching={isFetching}
      isPending={isPending}
      goToPreviousMonth={goToPreviousMonth}
      goToNextMonth={goToNextMonth}
      archiveMonths={monthsStatus?.months ?? []}
    />
  );
};

export default DashboardContent;
