import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import SubmitButton from '@components/atoms/buttons/SubmitButton';
import MainPageBird from '@assets/Images/MainPageBird.png';
import useDisableScroll from '@hooks/useDisableScroll';
import { BookOpenIcon, ChartBarIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom'; 
import PageContainer from '@components/layout/PageContainer';
import ContentWrapper from '@components/layout/ContentWrapper';

const MobileHomePage: React.FC = () => {
  const navigate = useNavigate(); // Initialize navigate function
  return (
    <PageContainer centerChildren={true} className="md:pt-0">
      <ContentWrapper className='py-[10%] ' centerContent={true}>
        {/* Hero Text */}
        <div className="w-[95%] sm:w-[90%] text-center p-8 sm:p-10 rounded-lg shadow-lg bg-gradient-to-r from-[#001F3F] to-[#004080]">
          <div className="img-fade-in text-white text-xl sm:text-2xl tracking-wide leading-relaxed">
            Ta kontroll över din ekonomi med <br />
            <span className="font-bold text-limeGreen underline">eBudget</span>
            <br />
            Skapa trygghet för framtiden!
          </div>
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
        </div>

      {/* Image */}
      <div className="left-[50%]">
      <img src={MainPageBird} 
        alt="Main Page Bird" 
        className="w-60 h-auto border-limeGreen auto img-bounce 
        " 
      />
      </div>
      {/* CTA Button */}
      <div className=" mt-6 animate-pulse">
      <SubmitButton
        isSubmitting={false}
        label="Skaffa eBudget!"
        size="large"
        enhanceOnHover
        className=""
        onClick={() => navigate('/Registration')} 
      />
      </div>
      </ContentWrapper>
    </PageContainer>
  );
};

export default MobileHomePage;
