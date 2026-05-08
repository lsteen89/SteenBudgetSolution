import CloseMonthReviewModal from "@/components/organisms/dashboard/closeMonth/CloseMonthReviewModal";
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
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { useBudgetMonthStore } from "@/stores/Budget/budgetMonthStore";
import type { AppLocale } from "@/types/i18n/appLocale";
import type { BudgetMonthListItemDto } from "@/types/budget/BudgetMonthsStatusDto";
import { dashboardHeaderDict } from "@/utils/i18n/pages/private/dashboard/header/DashboardHeader.i18n";
import { closeMonthReviewModalDict } from "@/utils/i18n/pages/private/dashboard/closeMonth/CloseMonthReviewModal.i18n";
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
  const statusLabelKey = isAttention ? "overdue" : header.periodStatus;
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
  } else if ((isClosed || isSkipped) && continueTargetLabel && continueTargetKey) {
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
    onOpenPeriodEditor: handleOpenPeriodEditor,
  });

  const tReview: CloseReviewT = (key) =>
    tDict(key, locale, closeMonthReviewModalDict);
  const signedMoney = (amount: number, sign: "+" | "-") =>
    `${sign}${formatMoneyV2(Math.abs(amount), summary.currency, locale)}`;
  const savingsAndDebt = summary.totalSavings + summary.totalDebtPayments;
  const showIncomingCarryOver = summary.incomingCarryOverAmount > 0;

  const reviewItems = [
    ...(showIncomingCarryOver
      ? [
          {
            id: "incoming-carry-over",
            label: tReview("incomingCarryOverLabel"),
            amount: summary.incomingCarryOverAmount,
            formattedAmount: signedMoney(summary.incomingCarryOverAmount, "+"),
            onEdit: closeMonthReview.reviewMonth,
          },
        ]
      : []),
    {
      id: "income",
      label: tReview("incomeLabel"),
      amount: summary.totalIncome,
      formattedAmount: signedMoney(summary.totalIncome, "+"),
      onEdit: closeMonthReview.reviewMonth,
    },
    {
      id: "expenses",
      label: tReview("expensesLabel"),
      amount: summary.totalExpenditure,
      formattedAmount: signedMoney(summary.totalExpenditure, "-"),
      onEdit: closeMonthReview.reviewMonth,
    },
    {
      id: "savings-debt",
      label: tReview("savingsDebtLabel"),
      amount: savingsAndDebt,
      formattedAmount: signedMoney(savingsAndDebt, "-"),
      onEdit: closeMonthReview.reviewMonth,
    },
  ];

  const isSwitchingMonth = isFetching && !isPending;
  const periodControlVm = buildPeriodControlBarViewModel(summary, locale);

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
        <ClosedMonthRecapSection
          recap={recapQuery.data}
          currency={summary.currency}
          locale={locale}
          isLoading={recapQuery.isPending}
          errorMessage={recapQuery.error?.message}
          onRetry={() => void recapQuery.refetch()}
        />
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
            nextPeriodLabel={closeMonthReview.nextPeriodLabel}
            currency={summary.currency}
            reviewState={closeMonthReview.reviewState}
            reviewItems={reviewItems}
            surplusResolutionStatus={closeMonthReview.surplusResolutionStatus}
            isSubmitting={closeMonthReview.isSubmitting}
            onClose={closeMonthReview.close}
            onConfirm={closeMonthReview.confirm}
            onResolveToCarryOver={closeMonthReview.resolveToCarryOver}
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
    return (
      <DashboardErrorState
        title="Kunde inte ladda din dashboard"
        message={error?.message ?? "Försök igen om en stund."}
        onRetry={refetch}
        details={
          import.meta.env.MODE === "development"
            ? JSON.stringify(error, null, 2)
            : undefined
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
