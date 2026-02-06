import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import PageContainer from "@components/layout/PageContainer";
import ContentWrapper from "@components/layout/ContentWrapper";
import { useAuth } from '@/hooks/auth/useAuth';
import DashboardBirdBackground from "@assets/Images/Background/DashboardBirdBackground.png";
import { useNavigate, useLocation } from "react-router-dom"; // 
import DashboardContent from "@components/organisms/pages/DashboardContent";
import { AnimatePresence, motion } from "framer-motion";
import LoadingScreen from "@components/molecules/feedback/LoadingScreen";
import CenteredContainer from "@components/atoms/container/CenteredContainer";
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/stores/Auth/authStore';
import { TooltipProvider } from "@/components/ui/tooltip";
import { useWizardSaveQueue } from "@/stores/Wizard/wizardSaveQueue";
import { useWizardSessionStore } from "@/stores/Wizard/wizardSessionStore";


const SetupWizard = lazy(() => import("@/components/organisms/overlays/wizard/SetupWizard"));

const Dashboard: React.FC = () => {

  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const firstLogin = useAuthStore((s) => s.user?.firstLogin);

  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const clearQueue = useWizardSaveQueue((s) => s.clearQueue);
  const clearWizardSession = useWizardSessionStore((s) => s.clear);
  const wizardSessionId = useWizardSessionStore((s) => s.wizardSessionId);

  // prevents reopening if something re-renders while param still exists
  const openedFromQueryRef = useRef(false);

  useEffect(() => {
    if (!wizardSessionId) {
      clearQueue();
    }
  }, [wizardSessionId, clearQueue]);

  // Open wizard ONLY via URL param
  useEffect(() => {
    if (auth.isLoading || !auth.user) return;

    const params = new URLSearchParams(location.search);
    const shouldOpen = params.get("wizard") === "1";

    if (!shouldOpen) return;
    if (openedFromQueryRef.current) return;

    openedFromQueryRef.current = true;
    setIsWizardOpen(true);

    // remove the param so refresh/back doesn't pop it again
    params.delete("wizard");
    const nextSearch = params.toString();
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" },
      { replace: true }
    );
  }, [auth.isLoading, auth.user, location.search, location.pathname, navigate]);

  // Optional: if it's first login, wizard should definitely not be open
  useEffect(() => {
    if (firstLogin === true) setIsWizardOpen(false);
  }, [firstLogin]);

  if (auth.isLoading) {
    return (
      <CenteredContainer>
        <Skeleton />
      </CenteredContainer>
    );
  }

  if (!auth.user) return null;

  return (
    <PageContainer className="md:px-20 items-center min-h-screen overflow-y-auto h-full">
      <ContentWrapper centerContent className="lg:pt-24 3xl:pt-48 ">
        <DashboardContent
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
              <TooltipProvider>
                <SetupWizard
                  onClose={() => {
                    setIsWizardOpen(false);
                    openedFromQueryRef.current = false;

                    clearQueue();         // kill stale payloads
                    clearWizardSession(); // kill session
                  }}
                />
              </TooltipProvider>
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>


    </PageContainer>
  );
};

export default Dashboard;
