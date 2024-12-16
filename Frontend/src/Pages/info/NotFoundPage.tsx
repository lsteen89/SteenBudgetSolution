import React from 'react';
import { useNavigate } from 'react-router-dom';
import DeepBlueContainer from '@components/molecules/containers/DeepBlueContainer';
import AlternateSubmitButton from '@components/atoms/buttons/AlternateSubmitButton';
import LostBird from '@assets/Images/LostBird.png';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="relative flex justify-center items-start min-h-screen py-[300px]">
      <DeepBlueContainer 
      maxWidth="max-w-lg" 
      additionalClasses="
                  relative shadow-[0_5px_15px_rgba(133,224,133,0.2)] 
                  hover:shadow-[0_10px_140px_rgba(133,224,133,0.4)] 
                  hover:scale-105 transition-all duration-300 ease-in-out pt-30 pb-6
              "
      >   
        <h1 className="text-4xl font-bold text-red-500 mb-4">404 - Sidan finns inte</h1>
        <p className="text-lg mb-6">
          Oj.. Denna sida finns inte!
        </p>
        <AlternateSubmitButton
          isSubmitting={false}
          label="Tillbaka till startsidan"
          size="large"
          enhanceOnHover
          onClick={handleGoHome}
          />   
      </DeepBlueContainer>   
      {/* Bird Image */}
      <img
        src={LostBird}
        alt={'LostBird'}
        className="absolute right-[3%] top-[25%] transform translate-y-[10%] w-auto max-w-[320px] z-10
          1920:right-[250px]  1920:max-w-[400px]
          3xl:right-[1000px]  3xl:max-w-[400px]"
      />
    </div>
  );
};

export default NotFoundPage;
