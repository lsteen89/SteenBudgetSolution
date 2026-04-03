import EditPeriodDrawer from "@/components/organisms/dashboard/editPeriod/EditPeriodDrawer";
import ReturningDashboardSection from "@/components/organisms/dashboard/returning/ReturningDashboardSection";
import { useDashboardSummary } from "@/hooks/dashboard/useDashboardSummary";
import DashboardHomeSkeleton from "@components/organisms/dashboard/DashboardHomeSkeleton";
import FirstTimeDashboardSection from "@components/organisms/dashboard/FirstTimeDashboardSection";
import React, { useState } from "react";
import DashboardErrorState from "../dashboard/DashboardErrorState";

export interface DashboardContentProps {
  isFirstTimeLogin: boolean;
  isWizardOpen: boolean;
  setIsWizardOpen: (open: boolean) => void;
}

const isNotFound = (p: any) =>
  p?.status === 404 || p?.statusCode === 404 || p?.httpStatus === 404;

const DashboardContent: React.FC<DashboardContentProps> = ({
  isFirstTimeLogin,
  isWizardOpen,
  setIsWizardOpen,
}) => {
  const [isPeriodEditorOpen, setIsPeriodEditorOpen] = useState(false);

  const shouldFetchDashboard = !isFirstTimeLogin && !isWizardOpen;

  const { data, isPending, isError, error, refetch } = useDashboardSummary({
    enabled: shouldFetchDashboard,
  });

  if (isFirstTimeLogin) {
    return (
      <FirstTimeDashboardSection onStartWizard={() => setIsWizardOpen(true)} />
    );
  }

  if (isWizardOpen) return null;

  if (isPending) return <DashboardHomeSkeleton />;

  if (isError && isNotFound(error)) {
    return (
      <FirstTimeDashboardSection onStartWizard={() => setIsWizardOpen(true)} />
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
      <FirstTimeDashboardSection onStartWizard={() => setIsWizardOpen(true)} />
    );
  }

  return (
    <>
      <ReturningDashboardSection
        summary={data.summary}
        onOpenPeriodEditor={() => setIsPeriodEditorOpen(true)}
      />

      <EditPeriodDrawer
        open={isPeriodEditorOpen}
        periodLabel={data.summary.header.periodLabel}
        periodDateRangeLabel={data.summary.header.periodDateRangeLabel}
        onClose={() => {
          console.log("onClose called");
          setIsPeriodEditorOpen(false);
        }}
        onSave={async () => {
          setIsPeriodEditorOpen(false);
          await refetch();
        }}
      />
    </>
  );
};

export default DashboardContent;
