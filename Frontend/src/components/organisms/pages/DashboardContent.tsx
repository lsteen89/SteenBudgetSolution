import React from "react";
import DashboardHomeSkeleton from "@components/organisms/dashboard/DashboardHomeSkeleton";
import FirstTimeDashboardSection from "@components/organisms/dashboard/FirstTimeDashboardSection";
import ReturningDashboardSection from "@/components/organisms/dashboard/returning/ReturningDashboardSection";
import DashboardErrorState from "../dashboard/DashboardErrorState";
import { useDashboardSummary } from "@hooks/dashboard/useDashboardSummary";

export interface DashboardContentProps {
  isFirstTimeLogin: boolean;
  isWizardOpen: boolean;
  setIsWizardOpen: (open: boolean) => void;
}

const isNotFound = (p: any) =>
  p?.status === 404 || p?.statusCode === 404 || p?.httpStatus === 404;

const DashboardContent: React.FC<DashboardContentProps> = ({
  isFirstTimeLogin,
  setIsWizardOpen,
}) => {
  const { data, isPending, isError, error, refetch } = useDashboardSummary();

  if (isPending) return <DashboardHomeSkeleton />;

  // Treat 404 as "no dashboard yet" => show FirstTime section
  if (isFirstTimeLogin || (isError && isNotFound(error)) || (!isError && !data)) {
    return <FirstTimeDashboardSection onStartWizard={() => setIsWizardOpen(true)} />;
  }

  if (isError) {
    return (
      <DashboardErrorState
        title="Kunde inte ladda din dashboard"
        message={error?.message ?? "Försök igen om en stund."}
        onRetry={refetch}
        details={import.meta.env.MODE === "development" ? JSON.stringify(error, null, 2) : undefined}
      />
    );
  }

  return (
    <ReturningDashboardSection
      summary={data!.summary}
      onOpenWizard={() => setIsWizardOpen(true)}
    />
  );
};

export default DashboardContent;
