import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainPageBird from '../../assets/Images/MainPageBird.svg';
import SubmitButton from '../../components/atoms/buttons/SubmitButton';
import useDisableScroll from '../../hooks/useDisableScroll';

const HomePage = () => {
  const navigate = useNavigate();

  const handleRedirect = () => {
    navigate('/Registration');
  };
  // Disable scrolling on this page
  useDisableScroll(true);

  return (
    <div className="relative flex justify-center items-center h-screen">
      {/* Main Page Text Container */}
      <div
        className="
          absolute top-[20vh] left-[40%] transform -translate-x-1/2
          md:left-[30%] md:w-[20vw] md:h-[75vh]
          lg:left-[30%] lg:w-[20vw] lg:h-[75vh]
          md:h-[80vh]
          1920:left-[30%] 1920:w-[18vw]
          3xl:w-[10vw] 3xl:left-[40%] 3x1:h-[calc(100vh-45vh)]
          flex flex-col justify-start items-center
          min-h-[30vh] h-[calc(100vh-20vh)] w-[10vw]
          p-10 pt-12
          hd:p-5
          bg-[url('../../assets/Images/MainPageRect.svg')] bg-cover bg-center
          overflow-hidden shadow-md rounded-md
          z-10
        "
      >
        <p className="text-white text-left m-0 tracking-[0.2em] max-w-[90%] text-[clamp(1rem,2vw,1.5rem)] leading-[clamp(1.5,2.5vw,2)]">
          Ta kontroll över din ekonomi med <br /> <span className="font-bold text-limeGreen underline">eBudget</span> <br /> och skapa trygghet för 
          framtiden genom smart budgetering!
        </p>
        
      </div>

      {/* Button Wrapper */}
      <div
        className="
          absolute top-[40%] left-[60%] transform -translate-x-1/2 -translate-y-1/2
          md:top-[30%]
          flex justify-center items-center
          z-20
        "
      >
        <SubmitButton
          isSubmitting={false}
          label="Skaffa eBudget!"
          size="large"
          onClick={handleRedirect}
        />
      </div>
      
      {/* Image Wrapper */}
      <div
        className="
          fixed top-[45%] left-[49%] transform -translate-x-1/2
          md:left-[60%] md:h-[40vh]
          xl:scale-75
          z-0
        "
      >
        <img
          src={MainPageBird}
          alt="Bird"
          className="max-w-full h-auto"
        />
      </div>
    </div>
  );
};

export default HomePage;
