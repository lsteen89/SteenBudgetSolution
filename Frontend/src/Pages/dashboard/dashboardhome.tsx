import React from "react";
import PageContainer from "@components/layout/PageContainer";
import ContentWrapper from "@components/layout/ContentWrapper";
import { useAuth } from "@context/AuthProvider";
import DashboardBirdBackground from "@assets/Images/Background/DashboardBirdBackground.png";
import { useNavigate } from 'react-router-dom';
import useMediaQuery from '@hooks/useMediaQuery'
import DashboardContent from "@components/organisms/pages/DashboardContent";
import SetupWizard from "@components/organisms/overlays/SetupWizard";

const Dashboard: React.FC = () => {

  const auth = useAuth();
  const isDebugMode = process.env.NODE_ENV === "development";
  const navigate = useNavigate();
  const isMdUp = useMediaQuery('(min-width: 768px)');
  const isDesktop = useMediaQuery('(min-width: 1367px)');
  const protectedRoutes = ['/dashboard'];
  const isProtectedRoute = protectedRoutes.includes(location.pathname);


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
        <DashboardContent navigate={navigate} />
      </ContentWrapper>
      
      {/* Conditionally render SetupWizard if firstTimeLogin is true */}
      {auth?.firstTimeLogin && <SetupWizard />}

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
