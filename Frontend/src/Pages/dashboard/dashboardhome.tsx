import React from "react";
import PageContainer from "@components/layout/PageContainer";
import ContentWrapper from "@components/layout/ContentWrapper";
import { useAuth } from "@context/AuthProvider";
import DashboardBirdBackground from "@assets/Images/Background/DashboardBirdBackground.png";
import { useNavigate } from 'react-router-dom';
import useMediaQuery from '@hooks/useMediaQuery'
import DashboardContent from "@components/organisms/pages/DashboardContent";
import SetupWizard from "@components/organisms/overlays/SetupWizard";
import { AnimatePresence, motion } from "framer-motion";

const Dashboard: React.FC = () => {

  const auth = useAuth();
  const isDebugMode = process.env.NODE_ENV === "development";
  const navigate = useNavigate();
  const isMdUp = useMediaQuery('(min-width: 768px)');
  const isDesktop = useMediaQuery('(min-width: 1367px)');
  const protectedRoutes = ['/dashboard'];
  const isProtectedRoute = protectedRoutes.includes(location.pathname);
  const isFirstTimeLogin = auth?.firstTimeLogin;
  const [shouldShowWizard, setShouldShowWizard] = React.useState(false);
  React.useEffect(() => {
    if (isFirstTimeLogin) {
      setTimeout(() => setShouldShowWizard(true), 50);
    }
  }, [isFirstTimeLogin]);

  // If firstTimeLogin is true, start with wizard open. 
  // Otherwise, it's closed.
  const [isWizardOpen, setIsWizardOpen] = React.useState(true); // or based on auth?.firstTimeLogin

  console.log("Authenticated:", auth?.authenticated);
  console.log("Debug Mode:", isDebugMode);
  console.log('isDesktop:', isDesktop);
  console.log('location.pathname:', location.pathname);
  console.log('isProtectedRoute:', isProtectedRoute);
  //console.log('Environment Variables:', import.meta.env);
  console.log("Is first time user:", auth?.firstTimeLogin); 
  
  return (
<PageContainer className="md:px-20 items-center min-h-screen overflow-y-auto h-full">
      <ContentWrapper centerContent className="lg:pt-24 3xl:pt-48 ">
      <DashboardContent
          navigate={navigate}
          isFirstTimeLogin={auth?.firstTimeLogin}  // pass boolean
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
            <SetupWizard onClose={() => setIsWizardOpen(false)} />
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
