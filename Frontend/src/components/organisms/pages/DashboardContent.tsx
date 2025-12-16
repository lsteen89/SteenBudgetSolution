import React from 'react';
import type { NavigateFunction } from 'react-router-dom';

import LoadingScreen from '@components/molecules/feedback/LoadingScreen';
import FirstTimeDashboardSection from '@components/organisms/dashboard/FirstTimeDashboardSection';
import ReturningDashboardSection from '@components/organisms/dashboard/ReturningDashboardSection';
import { useDashboardSummary } from '@hooks/dashboard/useDashboardSummary';

export interface DashboardContentProps {
  navigate: NavigateFunction;
  isFirstTimeLogin: boolean;
  isWizardOpen: boolean;
  setIsWizardOpen: (open: boolean) => void;
}

const DashboardContent: React.FC<DashboardContentProps> = ({
  navigate,
  isFirstTimeLogin,
  setIsWizardOpen,
}) => {
  const { data, isLoading, isError } = useDashboardSummary();

  if (isLoading) return <LoadingScreen />;

  if (isFirstTimeLogin) {
    return <FirstTimeDashboardSection onStartWizard={() => setIsWizardOpen(true)} navigate={navigate} />;
  }

  if (isError) {
    // If dashboard endpoint says "not found", treat as "no budget yet"
    return <FirstTimeDashboardSection onStartWizard={() => setIsWizardOpen(true)} navigate={navigate} />;
  }

  if (!data) {
    // returning user but no dashboard data yet -> show loader or dedicated empty state
    return <LoadingScreen />; // simplest
    // or <NoBudgetYetSection onStartWizard=... />
  }

  return (
    <ReturningDashboardSection
      navigate={navigate}
      onOpenWizard={() => setIsWizardOpen(true)}
      summary={data}
    />
  );
};

export default DashboardContent;
