import React from 'react';
import DeepBlueContainer from '@components/molecules/containers/DeepBlueContainer';

const HomePageTextContainer: React.FC = () => {
  return (
    <DeepBlueContainer
    additionalClasses="
    absolute top-[15vh] left-[50%] transform -translate-x-1/2
    w-[90%] h-[45vh]  /* Defaults for mobile */
    sm:top-[15vh] sm:w-[90%] sm:h-[45vh] /* Small screens */
    md:top-[30vh] md:left-[30%] md:w-[20vw] md:h-[75vh]
    lg:top-[30vh] lg:left-[30%] lg:w-[20vw] lg:h-[75vh]
    1920:top-[30vh] 1920:left-[30%] 1920:w-[18vw]
    3xl:top-[30vh] 3xl:w-[10vw] 3xl:left-[40%] 3xl:h-[calc(100vh-20vh)]
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
        Ta kontroll över din ekonomi med <br />
        <span className="font-bold text-limeGreen underline">eBudget</span>
        <br />
        och skapa trygghet för framtiden genom smart budgetering!
      </p>
    </DeepBlueContainer>
  );
};

export default HomePageTextContainer;
