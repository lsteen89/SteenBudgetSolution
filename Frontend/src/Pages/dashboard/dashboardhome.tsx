import React, { lazy, Suspense, useEffect, useState } from 'react';
import PageContainer from "@components/layout/PageContainer";
import ContentWrapper from "@components/layout/ContentWrapper";
import { useAuth } from '@/hooks/auth/useAuth';
import DashboardBirdBackground from "@assets/Images/Background/DashboardBirdBackground.png";
import { useNavigate } from 'react-router-dom';
import DashboardContent from "@components/organisms/pages/DashboardContent";
const SetupWizard = lazy(() => import('@/components/organisms/overlays/wizard/SetupWizard'));
import { AnimatePresence, motion } from "framer-motion";
import LoadingScreen from "@components/molecules/feedback/LoadingScreen";
import CenteredContainer from "@components/atoms/container/CenteredContainer";
import { Skeleton } from '@/components/ui/Skeleton';

const Dashboard: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();

  const firstLogin = auth.user?.firstLogin ?? false;

  console.log('[Dashboard] First login:', firstLogin);
  console.log('[Dashboard] User:', auth.user);

  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Sync wizard open state once auth is resolved
  useEffect(() => {
    if (!auth.isLoading) {
      setIsWizardOpen(firstLogin);
    }
  }, [auth.isLoading, firstLogin]);

  if (auth.isLoading) {
    return (
      <CenteredContainer>
        <Skeleton />
      </CenteredContainer>
    );
  }
  if (!auth.user) {
    return null;
  }

  return (
    <PageContainer className="md:px-20 items-center min-h-screen overflow-y-auto h-full">
      <ContentWrapper centerContent className="lg:pt-24 3xl:pt-48 ">
        <DashboardContent
          navigate={navigate}
          isFirstTimeLogin={firstLogin}
          isWizardOpen={isWizardOpen}
          setIsWizardOpen={setIsWizardOpen}
        />
      </ContentWrapper>

      <AnimatePresence>
        {isWizardOpen && (
          <motion.div
            key="setupWizard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="z-[9999]"
          >
            <Suspense fallback={<LoadingScreen />}>
              <SetupWizard onClose={() => setIsWizardOpen(false)} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      <img
        src={DashboardBirdBackground}
        alt="Dashboard Background"
        className="fixed bottom-0 right-0 sm:w-[150px] sm:h-auto md:w-auto md:h-auto lg:w-[400px] z-[-10] pointer-events-none"
      />
    </PageContainer>
  );
};

export default Dashboard;
