import CloseMonthReviewModal from "@/components/organisms/dashboard/closeMonth/CloseMonthReviewModal";
import EditPeriodDrawer from "@/components/organisms/dashboard/editPeriod/EditPeriodDrawer";
import ClosedMonthRecapSection from "@/components/organisms/dashboard/recap/ClosedMonthRecapSection";
import SkippedMonthState from "@/components/organisms/dashboard/recap/SkippedMonthState";
import ReturningDashboardSection from "@/components/organisms/dashboard/returning/ReturningDashboardSection";
import PeriodControlBar, {
  type PeriodControlBarViewModel,
} from "@/components/organisms/dashboard/shell/PeriodControlBar";
import { useBudgetMonthRecapQuery } from "@/hooks/budget/useBudgetMonthRecapQuery";
import { useCloseMonthReviewController } from "@/hooks/dashboard/useCloseMonthReviewController";
import { useDashboardSummary } from "@/hooks/dashboard/useDashboardSummary";
import type { DashboardSummary } from "@/hooks/dashboard/dashboardSummary.types";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { AppLocale } from "@/types/i18n/appLocale";
import { dashboardHeaderDict } from "@/utils/i18n/pages/private/dashboard/header/DashboardHeader.i18n";
import { tDict } from "@/utils/i18n/translate";
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

  return {
    current: {
      yearMonth: header.periodKey,
      label: header.periodLabel,
      status: header.periodStatus,
      statusLabel: t(statusLabelKey),
      tone: currentTone,
    },
    previous: {
      label: header.previousPeriodLabel ?? t("previous"),
      disabled: !header.canGoPrevious,
    },
    next: {
      label: header.nextPeriodLabel ?? t("next"),
      disabled: !header.canGoNext,
    },
    ribbonItems: [
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
      {
        label: comparisonLabel,
        tone: isAttention ? "attention" : isSkipped ? "muted" : "neutral",
        icon: "compare",
      },
      {
        label: nextLabel,
        tone: header.canGoNext ? "neutral" : "muted",
        icon: "next",
      },
    ],
    action: showCloseAction
      ? {
          type: "close",
          label: header.closeMonthButtonLabel as string,
          helperText:
            header.lifecycleState === "overdue"
              ? t("actionRequired")
              : header.lifecycleState === "eligible"
                ? t("readyToFinalize")
                : null,
          attention: header.lifecycleState === "overdue",
        }
      : isClosed
        ? {
            type: "passive",
            label: t("periodContextClosedMeaning"),
            tone: "success",
          }
        : isSkipped
          ? {
              type: "passive",
              label: t("periodActionNoSnapshot"),
              tone: "muted",
            }
          : { type: "none" },
  };
}

type LoadedDashboardContentProps = {
  summary: DashboardSummary;
  isFetching: boolean;
  isPending: boolean;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
};

function LoadedDashboardContent({
  summary,
  isFetching,
  isPending,
  goToPreviousMonth,
  goToNextMonth,
}: LoadedDashboardContentProps) {
  const [isPeriodEditorOpen, setIsPeriodEditorOpen] = useState(false);
  const locale = useAppLocale();

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

  const reviewItems = [
    {
      id: "income",
      label: "Income",
      amount: summary.totalIncome,
      onEdit: closeMonthReview.reviewMonth,
    },
    {
      id: "expenses",
      label: "Expenses",
      amount: summary.totalExpenditure,
      onEdit: closeMonthReview.reviewMonth,
    },
    {
      id: "savings-debt",
      label: "Savings & Debt",
      amount: summary.totalSavings + summary.totalDebtPayments,
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
    />
  );
};

export default DashboardContent;
