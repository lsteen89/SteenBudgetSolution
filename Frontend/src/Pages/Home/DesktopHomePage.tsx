import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainPageBird from '@assets/Images/MainPageBird.png';
import SubmitButton from '@components/atoms/buttons/SubmitButton';
import useDisableScroll from '@hooks/useDisableScroll';
import { BookOpenIcon, ChartBarIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom'; 
import DeepBlueContainer from '@components/molecules/containers/DeepBlueContainer';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  // Redirect function
  const handleRedirect = (): void => {
    navigate('/Registration');
  };

  return (
    <div className="relative align-items: flex-start flex items-center justify-center h-screen gap-[8vw] mt-[15vh]">
        {/* Left Container */}
        <DeepBlueContainer additionalClasses="h-[70vh] flex-grow flex-col flex items-center max-w-md space-y-10 mt-[10%] px-8 h-full pt-[2%]
        lg:mt-[15%]
        ">
        <p className="text-white text-center m-0 tracking-[0.2em] max-w-[90%] text-[clamp(1rem,2vw,1.5rem)] leading-[clamp(1.5,2.5vw,2)]">
          Ta kontroll över din ekonomi med <br />
          <span className="font-bold text-limeGreen underline">eBudget</span>
          <br />
          och skapa trygghet för framtiden genom smart budgetering!
        </p>
        <div className="pt-14 flex flex-col space-y-8 items-center">
          <div className="relative group flex flex-col items-center">
            <BookOpenIcon className="h-10 w-10 text-limeGreen transition-transform transform group-hover:scale-110 group-hover:shadow-lg" />
            <p className="text-white mt-2 text-center">Enkel planering</p>
            {/* Tooltip */}
            <div className="absolute bottom-14 hidden group-hover:block bg-black text-white text-xs p-2 rounded shadow-lg">
              Planera din budget enkelt och snabbt! Läs mer under<Link to="/" className="underline text-limeGreen"> Hjälp </Link>
            </div>
          </div>
          <div className="relative group flex flex-col items-center">
            <ChartBarIcon className="h-10 w-10 text-limeGreen transition-transform transform group-hover:scale-110 group-hover:shadow-lg" />
            <p className="text-white mt-2 text-center">Enkel visualisering av sparandet</p>
            {/* Tooltip */}
            <div className="absolute bottom-14 hidden group-hover:block bg-black text-white text-xs p-2 rounded shadow-lg">
              Få tydlig insikt i dina utgifter och sparande med enkel visualisering och diagram! Inga konstigheter!
            </div>
          </div>
          <div className="relative group flex flex-col items-center">
            <ShieldCheckIcon className="h-10 w-10 text-limeGreen transition-transform transform group-hover:scale-110 group-hover:shadow-lg" />
            <p className="text-white mt-2 text-center">ALLTID säkerhet först</p>
            {/* Tooltip */}
            <div className="absolute bottom-14 hidden group-hover:block bg-black text-white text-xs p-2 rounded shadow-lg">
              Dina data är skyddad med högsta säkerhet! Läs mer under <Link to="/" className="underline text-limeGreen"> Integritetspolicy </Link>
            </div>
          </div>
        </div>
        </DeepBlueContainer>

        {/* Right-Side Container */}
        <div className="flex flex-col justify-center space-y-8 h-full         
            lg:mt-[5%]
          ">
          <SubmitButton
            isSubmitting={false}
            label="Skaffa eBudget!"
            size="large"
            enhanceOnHover
            onClick={handleRedirect}
          />
          <img
            src={MainPageBird}
            alt="Main Page Bird"
            className="max-w-full h-auto animate-float hover:animate-flap"
          />

        </div>
        
    </div>
  );
};

export default HomePage;
