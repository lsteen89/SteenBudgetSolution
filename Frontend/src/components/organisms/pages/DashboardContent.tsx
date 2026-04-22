import CloseMonthReviewModal from "@/components/organisms/dashboard/closeMonth/CloseMonthReviewModal";
import EditPeriodDrawer from "@/components/organisms/dashboard/editPeriod/EditPeriodDrawer";
import ReturningDashboardSection from "@/components/organisms/dashboard/returning/ReturningDashboardSection";
import type { RequestCloseMonthHandler } from "@/hooks/dashboard/closeMonth.types";
import { resolveCloseMonthReviewState } from "@/hooks/dashboard/resolveCloseMonthReviewState";
import { useCloseMonthReviewController } from "@/hooks/dashboard/useCloseMonthReviewController";
import { useDashboardSummary } from "@/hooks/dashboard/useDashboardSummary";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import DashboardHomeSkeleton from "@components/organisms/dashboard/DashboardHomeSkeleton";
import FirstTimeDashboardSection from "@components/organisms/dashboard/FirstTimeDashboardSection";
import React, { useCallback, useState } from "react";
import DashboardErrorState from "../dashboard/DashboardErrorState";

export interface DashboardContentProps {
  isFirstTimeLogin: boolean;
  isWizardOpen: boolean;
  setIsWizardOpen: (open: boolean) => void;
  onRequestCloseMonth?: RequestCloseMonthHandler;
}

const isNotFound = (p: any) =>
  p?.status === 404 || p?.statusCode === 404 || p?.httpStatus === 404;

const DashboardContent: React.FC<DashboardContentProps> = ({
  isFirstTimeLogin,
  isWizardOpen,
  setIsWizardOpen,
  onRequestCloseMonth,
}) => {
  const locale = useAppLocale();

  const [isPeriodEditorOpen, setIsPeriodEditorOpen] = useState(false);
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

  const summary = data.summary;
  const yearMonth = summary.header.periodKey;

  const closeMonthReviewState = resolveCloseMonthReviewState({
    remainingToSpend: summary.remainingToSpend,
  });

  function handleOpenPeriodEditor() {
    if (!yearMonth) return;
    setIsPeriodEditorOpen(true);
  }

  const closeMonthReview = useCloseMonthReviewController({
    yearMonth,
    summary,
    onRequestCloseMonth,
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

  return (
    <>
      <ReturningDashboardSection
        summary={summary}
        onOpenPeriodEditor={handleOpenPeriodEditor}
        onCloseMonth={closeMonthReview.open}
        onGoPreviousPeriod={goToPreviousMonth}
        onGoNextPeriod={goToNextMonth}
        isSwitchingMonth={isFetching && !isPending}
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
  );
};

export default DashboardContent;
