import React from 'react';

import DashboardHomeSkeleton from '@components/organisms/dashboard/DashboardHomeSkeleton';
import FirstTimeDashboardSection from '@components/organisms/dashboard/FirstTimeDashboardSection';
import ReturningDashboardSection from '@/components/organisms/dashboard/returning/ReturningDashboardSection';
import { useDashboardSummary } from "@hooks/dashboard/useDashboardSummary";
import DashboardErrorState from '../dashboard/DashboardErrorState';

export interface DashboardContentProps {
  isFirstTimeLogin: boolean;
  isWizardOpen: boolean;
  setIsWizardOpen: (open: boolean) => void;
}

const DashboardContent: React.FC<DashboardContentProps> = ({
  isFirstTimeLogin,
  setIsWizardOpen,
}) => {
  const { data, status, error, refetch } = useDashboardSummary();


  if (status === "idle" || status === "loading") return <DashboardHomeSkeleton />;

  if (isFirstTimeLogin || status === "notfound") {
    return <FirstTimeDashboardSection onStartWizard={() => setIsWizardOpen(true)} />;
  }

  if (status === "error") {
    return (
      <DashboardErrorState
        title="Kunde inte ladda din dashboard"
        message={error?.message ?? "Försök igen om en stund."}
        onRetry={refetch}
        details={import.meta.env.MODE === "development" ? JSON.stringify(error, null, 2) : undefined}
      />
    );
  }

  return <ReturningDashboardSection summary={data!.summary} onOpenWizard={() => setIsWizardOpen(true)} />;
};

export default DashboardContent;
