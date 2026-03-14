import { AnimatePresence, motion } from "framer-motion";
import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import ContentWrapperV2 from "@/components/layout/ContentWrapperV2";
import PageContainer from "@components/layout/PageContainer";

import { Skeleton } from "@/components/ui/Skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import CenteredContainer from "@components/atoms/container/CenteredContainer";
import LoadingScreen from "@components/molecules/feedback/LoadingScreen";

import { useAuth } from "@/hooks/auth/useAuth";
import { useAuthStore } from "@/stores/Auth/authStore";
import { useWizardSaveQueue } from "@/stores/Wizard/wizardSaveQueue";
import { useWizardSessionStore } from "@/stores/Wizard/wizardSessionStore";

import DashboardContent from "@components/organisms/pages/DashboardContent";

const SetupWizard = lazy(
  () => import("@/components/organisms/overlays/wizard/SetupWizard"),
);

const Dashboard: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const firstLogin = useAuthStore((s) => s.user?.firstLogin);

  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const clearQueue = useWizardSaveQueue((s) => s.clearQueue);
  const clearWizardSession = useWizardSessionStore((s) => s.clear);
  const wizardSessionId = useWizardSessionStore((s) => s.wizardSessionId);

  const openedFromQueryRef = useRef(false);

  useEffect(() => {
    if (!wizardSessionId) clearQueue();
  }, [wizardSessionId, clearQueue]);

  useEffect(() => {
    if (auth.isLoading || !auth.user) return;

    const params = new URLSearchParams(location.search);
    const shouldOpen = params.get("wizard") === "1";
    if (!shouldOpen) return;
    if (openedFromQueryRef.current) return;

    openedFromQueryRef.current = true;
    setIsWizardOpen(true);

    params.delete("wizard");
    const nextSearch = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : "",
      },
      { replace: true },
    );
  }, [auth.isLoading, auth.user, location.search, location.pathname, navigate]);

  if (auth.isLoading) {
    return (
      <CenteredContainer>
        <Skeleton />
      </CenteredContainer>
    );
  }

  if (!auth.user) return null;

  return (
    <PageContainer noPadding className="relative">
      {/* decorative blobs (same recipe as Registration) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[rgb(var(--eb-shell)/0.45)] blur-2xl" />
        <div className="absolute -top-24 left-[10%] h-56 w-56 rounded-full bg-[rgb(var(--eb-shell)/0.30)] blur-2xl" />
        <div className="absolute -top-24 right-[10%] h-64 w-64 rounded-full bg-[rgb(var(--eb-shell)/0.30)] blur-2xl" />
      </div>

      <ContentWrapperV2
        size="xl"
        className="relative pt-10 sm:pt-14 pb-12 sm:pb-16"
      >
        <DashboardContent
          isFirstTimeLogin={firstLogin === true}
          isWizardOpen={isWizardOpen}
          setIsWizardOpen={setIsWizardOpen}
        />
      </ContentWrapperV2>

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
                    clearQueue();
                    clearWizardSession();
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
