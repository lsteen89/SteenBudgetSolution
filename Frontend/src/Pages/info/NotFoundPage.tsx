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
    <div
      className="
        relative flex flex-col sm:flex-row justify-center items-center 
        min-h-screen 
        py-[50px] 
        sm:py-[100px]
        hd:py-[300px]
        1920:py-[300px]
        3xl:py-[300px]"
    >
      {/* Box */}
      <DeepBlueContainer
        maxWidth="
          max-w-sm /* Default for mobile */
          sm:max-w-md /* Small screens (>= 640px) */
          ipad:top-[-30%] /* iPad (>= 768px) */
          md:max-w-lg /* Medium screens (>= 768px) */
          lg:max-w-xl /* Large screens (>= 1024px) */
          xl:max-w-2xl /* Extra-large screens (>= 1280px) */
        "
        additionalClasses="
          relative shadow-[0_5px_15px_rgba(133,224,133,0.2)] 
          hover:shadow-[0_10px_140px_rgba(133,224,133,0.4)] 
          hover:scale-105 transition-all duration-300 ease-in-out pt-30 pb-6 z-10
          xl:top-[0%] xl:max-w-[500px]
          1920:top-[0%] 1920:max-w-[500px]
          3xl:bottom-[30%]
        "
      >
        <h1 className="text-4xl font-bold text-red-500 mb-4">404 - Sidan finns inte</h1>
        <p className="text-lg mb-6">Oj.. Denna sida finns inte!</p>
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
        alt="LostBird"
        className="
          w-auto 
          max-w-[200px] sm:max-w-[250px] md:max-w-[300px] lg:max-w-[350px] xl:max-w-[400px]
          sm:absolute 
          sm:right-[5%] lg:right-[10%] xl:right-[2%] 
          top-[100%] sm:top-[50%] lg:top-[30%] 3xl:top-[20%]
          iphone-se:top-[60%] /* Adjust for iPhone SE */

          3xl:right-[30%]
        "
      />
    </div>
  );
};

export default NotFoundPage;
