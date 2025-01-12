import React from 'react';
import { useNavigate } from 'react-router-dom';
import DeepBlueContainer from '@components/molecules/containers/DeepBlueContainer';
import AlternateSubmitButton from '@components/atoms/buttons/AlternateSubmitButton';
import LostBird from '@assets/Images/LostBird.png';
import PageContainer from '@components/Layout/PageContainer';
import ContentWrapper from '@components/Layout/ContentWrapper';
const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <PageContainer>
      <ContentWrapper>
        {/* Box */}
        <DeepBlueContainer
          additionalClasses="
            flex flex-col items-center justify-center
            p-8 md:p-12 lg:p-16 xl:p-20
            w-full max-w-2xl
            mt-8 md:mt-12 lg:mt-16 xl:mt-20 z-10
          "
        >
          <h1 className="text-4xl font-bold text-red-500 mb-4">404 - Sidan finns inte</h1>
          <p className="text-lg mb-6 text-white">Oj.. Denna sida finns inte!</p>
          <AlternateSubmitButton
            isSubmitting={false}
            label="Tillbaka till startsidan"
            size="large"
            enhanceOnHover
            onClick={handleGoHome}
          />
        </DeepBlueContainer>

      </ContentWrapper>
                      {/* Bird Image */}
                      <img
          src={LostBird}
          alt="LostBird"
          className="z-0 max-w-xs

          "
        />
    </PageContainer>
  );
};

export default NotFoundPage;
