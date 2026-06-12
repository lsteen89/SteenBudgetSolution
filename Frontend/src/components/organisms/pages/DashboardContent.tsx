import CloseMonthReviewModal from "@/components/organisms/dashboard/closeMonth/CloseMonthReviewModal";
import ClosedMonthHandoffCard from "@/components/organisms/dashboard/closeMonth/ClosedMonthHandoffCard";
import EditPeriodDrawer from "@/components/organisms/dashboard/editPeriod/EditPeriodDrawer";
import ClosedMonthRecapSection from "@/components/organisms/dashboard/recap/ClosedMonthRecapSection";
import SkippedMonthState from "@/components/organisms/dashboard/recap/SkippedMonthState";
import ReturningDashboardSection from "@/components/organisms/dashboard/returning/ReturningDashboardSection";
import MonthRail, {
  type MonthRailViewModel,
} from "@/components/organisms/dashboard/shell/MonthRail";
import type { PeriodActionSlotViewModel } from "@/components/organisms/dashboard/shell/PeriodActionSlot";
import { useBudgetMonthRecapQuery } from "@/hooks/budget/useBudgetMonthRecapQuery";
import { useNextMonthPreviewQuery } from "@/hooks/budget/useNextMonthPreviewQuery";
import { buildDashboardTerms } from "@/domain/budget/dashboardTerms";
import {
  nextYearMonth,
  selectNextMonthRemaining,
  ymLabel,
} from "@/domain/budget/nextMonthPreview";
import { appRoutes } from "@/routes/appRoutes";
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
import type { BudgetDashboardMonthDto } from "@/types/budget/BudgetDashboardMonthDto";
import type { BudgetMonthListItemDto } from "@/types/budget/BudgetMonthsStatusDto";
import { dashboardHeaderDict } from "@/utils/i18n/pages/private/dashboard/header/DashboardHeader.i18n";
import { closeMonthReviewModalDict } from "@/utils/i18n/pages/private/dashboard/closeMonth/CloseMonthReviewModal.i18n";
import { dashboardErrorStateDict } from "@/utils/i18n/pages/private/dashboard/DashboardErrorState.i18n";
import { tDict } from "@/utils/i18n/translate";
import DashboardHomeSkeleton from "@components/organisms/dashboard/DashboardHomeSkeleton";
import FirstTimeDashboardSection from "@components/organisms/dashboard/FirstTimeDashboardSection";
import React, { useCallback, useMemo, useState } from "react";
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

function buildMonthRailViewModel(
  summary: DashboardSummary,
  locale: AppLocale,
  options: {
    suppressContinueAction?: boolean;
    /**
     * Set when the viewed month is the active open month, it has no persisted
     * next month, and a read-only next-month preview is available. Turns the
     * otherwise-locked Next button into a preview-capable action that routes to
     * `/dashboard/next-month` (handled by the caller's `onGoNext`).
     */
    previewNext?: { monthLabel: string } | null;
  } = {},
): MonthRailViewModel {
  const t: HeaderT = (key) => tDict(key, locale, dashboardHeaderDict);
  const header = summary.header;
  const previewNextActive = !!options.previewNext && !header.canGoNext;
  const isSkipped = header.periodStatus === "skipped";
  const isClosed = header.periodStatus === "closed";
  const showCloseAction =
    header.periodStatus === "open" &&
    header.canCloseMonth &&
    !!header.closeMonthButtonLabel;
  const currentTone: MonthRailViewModel["current"]["tone"] = isSkipped
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

  const ribbonItems: MonthRailViewModel["ribbonItems"] = [
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
          } satisfies MonthRailViewModel["ribbonItems"][number],
        ]),
    {
      label: previewNextActive ? t("periodContextNextPreview") : nextLabel,
      tone: header.canGoNext || previewNextActive ? "neutral" : "muted",
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
    ariaLabel: t("monthRailAriaLabel"),
    loadingLabel: t("loadingPeriodSr"),
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
    next: previewNextActive
      ? {
          label: options.previewNext!.monthLabel,
          disabled: false,
          ariaLabel: replaceToken(
            t("nextMonthPreviewAria"),
            "month",
            options.previewNext!.monthLabel,
          ),
          mode: "preview",
        }
      : {
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
  /**
   * Raw open-month DTO. Closed/skipped branches do not render MoneyState, so
   * `dashboardMonth` is only forwarded into the open-month section.
   */
  dashboardMonth: BudgetDashboardMonthDto;
};

function LoadedDashboardContent({
  summary,
  breakdown,
  isFetching,
  isPending,
  goToPreviousMonth,
  goToNextMonth,
  archiveMonths,
  dashboardMonth,
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

  // Year of the period currently being viewed. Used to scope the chapter
  // ribbon + year strip on the close-month modal to that year only.
  const currentYear = yearMonth.slice(0, 4);
  const closedMonthsInYear = archiveMonths.reduce(
    (count, month) =>
      month.status === "closed" && month.yearMonth.startsWith(currentYear)
        ? count + 1
        : count,
    0,
  );
  const yearMonthList = Array.from(
    { length: 12 },
    (_, monthIndex) =>
      `${currentYear}-${String(monthIndex + 1).padStart(2, "0")}`,
  );
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

  // Preview-aware Next (PR4). The MonthRail Next button only knows persisted
  // months: when the active open month has no persisted next month, it is
  // normally disabled. If a read-only next-month preview is available, route
  // Next to `/dashboard/next-month` instead of disabling it.
  //
  // The query is gated to the active open month with no persisted next, and
  // shares its cache key with the PlanningRow card's preview fetch — so this
  // adds no extra request. Availability is the same honest gate the preview
  // page and planning card use (`selectNextMonthRemaining` is null when there
  // is no eligible preview or the budget plan is empty). The from-month for
  // the preview is never the next month, so no `/dashboard?yearMonth={next}`
  // request is ever made.
  const isViewingOpenMonth = summary.header.periodStatus === "open";
  const hasPersistedNext = summary.header.canGoNext;
  const previewFromYearMonth =
    isViewingOpenMonth && !hasPersistedNext ? yearMonth : null;
  const nextMonthPreviewQuery = useNextMonthPreviewQuery(previewFromYearMonth, {
    enabled: !!previewFromYearMonth,
  });
  const previewNextActive =
    !!previewFromYearMonth &&
    selectNextMonthRemaining(nextMonthPreviewQuery.data) !== null;
  const previewNextMonthLabel = previewFromYearMonth
    ? ymLabel(
        nextMonthPreviewQuery.data?.previewYearMonth ??
          nextYearMonth(previewFromYearMonth),
        locale,
      )
    : null;

  const handleGoNext = previewNextActive
    ? () => navigate(appRoutes.dashboardNextMonth)
    : goToNextMonth;

  const monthRailVm = buildMonthRailViewModel(summary, locale, {
    suppressContinueAction: isJustClosedHandoffVisible,
    previewNext:
      previewNextActive && previewNextMonthLabel
        ? { monthLabel: previewNextMonthLabel }
        : null,
  });

  // Quick Edit drawer projection uses the dashboard's authoritative
  // six-term equation. The drawer only renders for open months, but we
  // build the terms here so the open/closed/skipped status switch already
  // narrowed `dashboardMonth` and the helpers receive a single source of
  // truth in sync with the dashboard pillars.
  const dashboardTermsResult = useMemo(
    () => buildDashboardTerms(dashboardMonth),
    [dashboardMonth],
  );

  return (
    <div className="w-full max-w-6xl space-y-5">
      <MonthRail
        vm={monthRailVm}
        onGoPrevious={goToPreviousMonth}
        onGoNext={handleGoNext}
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
              closedMonthOnlyLabel={closeMonthReview.periodMonthOnlyLabel}
              closedYearLabel={yearMonth.slice(0, 4)}
              nextMonthLabel={
                summary.header.nextPeriodLabel ??
                closeMonthReview.nextPeriodLabel
              }
              finalBalance={closeMonthReview.justClosed.finalBalance}
              carryOverMode={closeMonthReview.justClosed.carryOverMode}
              carryOverAmount={closeMonthReview.justClosed.carryOverAmount}
              monthlyIncome={summary.totalIncome}
              monthlyExpenses={summary.totalExpenditure}
              closedMonthsInYear={closedMonthsInYear}
              yearMonthList={yearMonthList}
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
            dashboardMonth={dashboardMonth}
            onOpenPeriodEditor={handleOpenPeriodEditor}
            onOpenFullExpenseEditor={() => navigate("/dashboard/expenses")}
            onOpenIncomeEditor={handleOpenIncomeEditor}
            onOpenFullIncomeEditor={() => navigate("/dashboard/income")}
            onOpenSavingsEditor={handleOpenSavingsEditor}
            onOpenFullSavingsEditor={() => navigate("/dashboard/savings")}
            onOpenDebtsEditor={handleOpenDebtsEditor}
            onOpenFullDebtsEditor={() => navigate("/dashboard/debts")}
            onOpenCloseMonth={closeMonthReview.open}
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
            closedMonthsInYear={closedMonthsInYear}
            yearMonthList={yearMonthList}
          />

          <EditPeriodDrawer
            open={isPeriodEditorOpen}
            yearMonth={yearMonth}
            periodLabel={summary.header.periodLabel}
            periodDateRangeLabel={summary.header.periodDateRangeLabel}
            panel={periodEditorPanel}
            dashboardTerms={dashboardTermsResult.terms}
            currency={summary.currency}
            dashboardSavings={{
              baseSavingsMonthly:
                dashboardMonth.liveDashboard?.savings?.monthlySavings ??
                summary.habitSavings,
              isMonthOnly:
                dashboardMonth.liveDashboard?.savings?.isMonthOnly ?? false,
              readOnly:
                dashboardMonth.month.status !== "open" ||
                !dashboardMonth.month.isEditable,
            }}
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
    dashboardMonth,
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

  if (!data || !dashboardMonth) {
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
      dashboardMonth={dashboardMonth}
      isFetching={isFetching}
      isPending={isPending}
      goToPreviousMonth={goToPreviousMonth}
      goToNextMonth={goToNextMonth}
      archiveMonths={monthsStatus?.months ?? []}
    />
  );
};

export default DashboardContent;
