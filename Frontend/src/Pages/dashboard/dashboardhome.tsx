import React from "react";
import PageContainer from "@components/layout/PageContainer";
import ContentWrapper from "@components/layout/ContentWrapper";
import { useAuth } from "@context/AuthProvider";
import DashboardBirdBackground from "@assets/Images/Background/DashboardBirdBackground.png";
import { useNavigate } from 'react-router-dom';
import ResponsiveSubmitButton from '@components/atoms/buttons/ResponsiveSubmitButton';
import SubmitButton from "@components/atoms/buttons/SubmitButton";
import useMediaQuery from '@hooks/useMediaQuery'

const Dashboard: React.FC = () => {

  const auth = useAuth();
  const isDebugMode = process.env.NODE_ENV === "development";
  const navigate = useNavigate();
  const isMdUp = useMediaQuery('(min-width: 768px)');

  console.log("Authenticated:", auth?.authenticated);
  console.log("Debug Mode:", isDebugMode);

  return (
  <PageContainer className="md:px-20 items-center">
    <ContentWrapper centerContent className="lg:pt-24 3xl:pt-48">
      <div
        className="
          grid
          grid-cols-1
          gap-4
          md:grid-cols-3
        "
      >
        {/* Button 1 */}
        <ResponsiveSubmitButton
          isSubmitting={false}
          label="Se din budget"
          enhanceOnHover
          fontSize="text-2xl"
          padding="py-4 px-8"
          className="
            w-64 h-16 whitespace-nowrap
            /* Place in row 1, col 1 on md (optional) */
            md:col-start-1
            md:row-start-1
            md:justify-self-center
            md:w-96 md:h-20
            lg:w-80 lg:h-20
            xl:w-96 xl:h-20
          "
          onClick={() => navigate('/budget')}
        />

        {/* Button 2 */}
        <ResponsiveSubmitButton
          isSubmitting={false}
          label="Skapa en budget"
          enhanceOnHover
          fontSize="text-2xl"
          padding="py-4 px-8"
          className="
            w-64 h-16 whitespace-nowrap
            /* Place in row 1, col 3 on md (optional) */
            md:col-start-3
            md:row-start-1
            md:justify-self-center
            md:w-96 md:h-20
            lg:w-80 lg:h-20
            xl:w-96 xl:h-20
          "
          onClick={() => navigate('/CreateBudget')}
        />

        {/* Bigger Premium Button */}
        <ResponsiveSubmitButton
          isSubmitting={false}
          label="Premiumtjänster"
          enhanceOnHover
          fontSize="text-2xl"
          padding="py-4 px-8"
          className="
            w-64 h-16
            md:w-96 md:h-20
            whitespace-nowrap
            md:col-start-2
            md:row-start-3
            md:justify-self-center
          "
          onClick={() => navigate('/GetPremium')}
        />
      </div>
      <div className="
  bg-blue-100        /* default (mobile-first) */
  sm:bg-blue-200     /* >=640px */
  md:bg-pink-300     /* >=768px */
  lg:bg-red-400     /* >=1024px */
  xl:bg-yellow-500     /* >=1280px */
  2xl:bg-blue-600    /* >=1536px */
">
  Responsive Component
</div>
    </ContentWrapper>
    {/* Anchored Image */}
    <img
      src={DashboardBirdBackground}
      alt="Dashboard Background"
          className="fixed bottom-0 right-0 sm:w-[150px] sm:h-auto md:w-auto md:h-auto lg:w-[400px] z-0"
        />
  </PageContainer>
  );
};

export default Dashboard;
