import React, { lazy, Suspense, useState } from 'react';
import PageContainer from "@components/layout/PageContainer";
import ContentWrapper from "@components/layout/ContentWrapper";
import { useAuth } from '@/hooks/auth/useAuth';
import DashboardBirdBackground from "@assets/Images/Background/DashboardBirdBackground.png";
import { useNavigate } from 'react-router-dom';
import useMediaQuery from '@hooks/useMediaQuery'
import DashboardContent from "@components/organisms/pages/DashboardContent";
const SetupWizard = lazy(() => import('@/components/organisms/overlays/wizard/SetupWizard'));
import { AnimatePresence, motion } from "framer-motion";
import LoadingScreen from "@components/molecules/feedback/LoadingScreen";
import CenteredContainer from "@components/atoms/container/CenteredContainer";

const Dashboard: React.FC = () => {

  const auth = useAuth();
  const isDebugMode = process.env.NODE_ENV === "development";
  const navigate = useNavigate();
  const firstLogin = (isDebugMode && !auth.user)
    ? true // In debug mode, if there's no user (e.g., due to bypass), simulate first login
    : (auth.user?.firstLogin ?? false); // Otherwise, use the actual value or default to false

  console.log('[Dashboard] First login:', firstLogin); // Debug log for first login state
  console.log('[Dashboard] User:', auth.user); // Debug log for user state
  // If firstTimeLogin is true, start with wizard open. 
  // Otherwise, it's closed.
  const [isWizardOpen, setIsWizardOpen] = React.useState(false);



  if (auth.isLoading) { // Use auth.isLoading
    return (
      <CenteredContainer>
        <LoadingScreen />
      </CenteredContainer>
    );
  }
  return (
    <PageContainer className="md:px-20 items-center min-h-screen overflow-y-auto h-full">
      <ContentWrapper centerContent className="lg:pt-24 3xl:pt-48 ">
        <DashboardContent
          navigate={navigate}
          isFirstTimeLogin={firstLogin}           // pass boolean
          isWizardOpen={isWizardOpen}             // pass current wizard state
          setIsWizardOpen={setIsWizardOpen}       // pass state setter
        />
      </ContentWrapper>

      {/* AnimatePresence for smooth mount/unmount */}
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

      {/* Anchored Image */}
      <img
        src={DashboardBirdBackground}
        alt="Dashboard Background"
        className="fixed bottom-0 right-0 sm:w-[150px] sm:h-auto md:w-auto md:h-auto lg:w-[400px] z-[-10] pointer-events-none"
      />
    </PageContainer>
  );
};

export default Dashboard;
