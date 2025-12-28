import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import PageContainer from "@components/layout/PageContainer";
import ContentWrapper from "@components/layout/ContentWrapper";
import { useAuth } from '@/hooks/auth/useAuth';
import DashboardBirdBackground from "@assets/Images/Background/DashboardBirdBackground.png";
import { useNavigate } from 'react-router-dom';
import DashboardContent from "@components/organisms/pages/DashboardContent";
import { AnimatePresence, motion } from "framer-motion";
import LoadingScreen from "@components/molecules/feedback/LoadingScreen";
import CenteredContainer from "@components/atoms/container/CenteredContainer";
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/stores/Auth/authStore';


const SetupWizard = lazy(() => import("@/components/organisms/overlays/wizard/SetupWizard"));

const Dashboard: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();

  // Undefined until user is loaded; treat as "unknown" not "true"
  const firstLogin = useAuthStore((s) => s.user?.firstLogin);

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (auth.isLoading || !auth.user) return;

    // only auto-open once, and only when firstLogin is explicitly true
    if (firstLogin === true && !autoOpenedRef.current) {
      setIsWizardOpen(true);
      autoOpenedRef.current = true;
    }
  }, [auth.isLoading, auth.user, firstLogin]);

  if (auth.isLoading) {
    return (
      <CenteredContainer>
        <Skeleton />
      </CenteredContainer>
    );
  }

  if (!auth.user) return null; // ProtectedRoute should prevent this anyway

  return (
    <PageContainer className="md:px-20 items-center min-h-screen overflow-y-auto h-full">
      <ContentWrapper centerContent className="lg:pt-24 3xl:pt-48 ">
        <DashboardContent
          // only true when known true
          isFirstTimeLogin={firstLogin === true}
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
            transition={{ duration: 0.25 }}
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
