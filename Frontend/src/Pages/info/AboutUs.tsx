import React from 'react';
import { useNavigate } from 'react-router-dom';
import SubmitButton from '@components/atoms/buttons/SubmitButton';
import DeepBlueContainer from '@components/molecules/containers/DeepBlueContainer';
import GlossyFlipCard from '@components/molecules/cards/GlossyFlipCard/GlossyFlipCard';
import AboutUsBird from '@assets/Images/AboutUsBird.png';
import PageContainer from '@components/layout/PageContainer';
import ContentWrapper from '@components/layout/ContentWrapper';

const AboutUs: React.FC = () => {
  const navigate = useNavigate();

  const handleRedirect = () => {
    navigate('/registration');
  };

  return (
    <PageContainer centerChildren={true}>
      <div className="flex flex-col justify-center items-center w-full max-w-screen
        lg:pt-20
        "
      >
        {/* Cards Section */}
        <div className="flex flex-row flex-wrap justify-center gap-5">
          <GlossyFlipCard
            frontText="Vad gör vi?"
            backText={
              <>
                Med <span style={{ color: 'limeGreen', fontWeight: 'bold' }}>eBudget</span> förenklar vi din ekonomiska vardag 
                genom smart budgetering, sparmål och verktyg som hjälper dig att ta kontroll över din ekonomi.
              </>
            }
          />

          <GlossyFlipCard
            frontText="Funktioner"
            backText={
              <>
                <span style={{ color: 'limeGreen', fontWeight: 'bold' }}>eBudget</span> hjälper dig att sätta mål, spåra dina framsteg och hålla koll på din ekonomi med kraftfulla verktyg för budgethantering.
              </>
            }
          />
          <GlossyFlipCard
            frontText="Premium funktioner"
            backText={
              <>
                Med <span style={{ color: 'limeGreen', fontWeight: 'bold' }}>eBudget</span> förenklar vi din ekonomiska vardag genom smart budgetering, sparmål och verktyg som hjälper dig att ta kontroll över din ekonomi.
              </>
            }
          />
        </div>

        {/* Main Page Text Container */}
        <div className="w-full max-w-4xl px-6 pt-8">
          <DeepBlueContainer additionalClasses="p-5">
            <div className="text-center p-5 space-y-4">
              {/* Header */}
              <p className="text-3xl font-extrabold text-white">
                Din framtid börjar med <span className="text-limeGreen">eBudget</span>!
              </p>
              {/* Supporting Text */}
              <p className="text-lg text-white">
                Upptäck hur enkelt det är att hantera din ekonomi, sätta mål och skapa trygghet – helt gratis!
              </p>
              {/* Highlighted Paragraph */}
              <p className="text-xl font-semibold text-limeGreen">
                Vill du ta din budget till nästa nivå? Uppgradera till Premium och få exklusiva funktioner som avancerade analyser och skräddarsydda insikter.
              </p>
              {/* Call to Action */}
              <p className="text-lg font-bold text-white">
                Börja idag och bli en del av vår växande gemenskap.
              </p>
              {/* Final CTA */}
              <p className="text-lg font-bold text-white">
                Registrera dig nu och börja din resa med <span className="text-limeGreen">eBudget</span> idag!
              </p>
            </div>
          </DeepBlueContainer>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mt-5">
          {/* Button Section */}
            <div className="flex-shrink-0">
              <SubmitButton
                isSubmitting={false}
                label="Skaffa eBudget!"
                size="large"
                enhanceOnHover
                onClick={handleRedirect}
              />
            </div>

            {/* Image Section */}
            <div>
              <img 
                src={AboutUsBird} 
                alt="About Us Bird" 
                className="w-auto max-w-xs" 
              />
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default AboutUs;
