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
  isWizardOpen,
  setIsWizardOpen,
}) => {
  const shouldFetchDashboard = !isFirstTimeLogin && !isWizardOpen;
  console.log("isFirstTimeLogin", isFirstTimeLogin);
  const { data, isPending, isError, error, refetch } = useDashboardSummary({
    enabled: shouldFetchDashboard,
  });

  // First login: intro page (wizard does NOT auto open)
  if (isFirstTimeLogin) {
    return <FirstTimeDashboardSection onStartWizard={() => setIsWizardOpen(true)} />;
  }

  // While wizard is open, do not render dashboard content at all
  // (your wizard overlay should be rendered by parent based on isWizardOpen)
  if (isWizardOpen) return null;

  if (isPending) return <DashboardHomeSkeleton />;

  // No budget yet => same intro
  if (isError && isNotFound(error)) {
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

  if (!data) {
    return <FirstTimeDashboardSection onStartWizard={() => setIsWizardOpen(true)} />;
  }

  return (
    <ReturningDashboardSection
      summary={data.summary}
      onOpenWizard={() => setIsWizardOpen(true)}
    />
  );
};

export default DashboardContent;
