import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import faqBird from '@assets/Images/FaqBird.png';
import { ChevronDownIcon, ChartBarIcon, LockClosedIcon, QuestionMarkCircleIcon, BellIcon, KeyIcon, UsersIcon, SparklesIcon, ArrowDownTrayIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import SubmitButton from '@components/atoms/buttons/SubmitButton'; 


const Faq: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number): void => {
    setActiveIndex(activeIndex === index ? null : index);
  };
  const navigate = useNavigate();

  const handleRedirect = () => {
    navigate('/contact');
  };
  const questions = [
    {
      question: 'Hur fungerar budgetering i eBudget?',
      answer: 'För att börja budgetera i eBudget, skapar du kategorier för inkomster och utgifter. Därefter kan du sätta upp sparmål och följa dina framsteg.',
      icon: <ChartBarIcon className="w-6 h-6 text-green-600" />,
    },
    {
      question: 'Är min data säker i eBudget?',
      answer: 'eBudget följer branschstandarder för kryptering och dataskydd, vilket garanterar att din information hanteras på ett säkert sätt.',
      icon: <LockClosedIcon className="w-6 h-6 text-blue-600" />,
    },
    {
      question: 'Hur kontaktar jag kundsupport?',
      answer: 'Vårt supportteam är tillgängligt via e-post eller kontaktformuläret på vår hemsida. Vi strävar efter att svara inom 24 timmar.',
      icon: <QuestionMarkCircleIcon className="w-6 h-6 text-yellow-600" />,
    },
    {
      question: 'Kan jag använda eBudget med flera användare?',
      answer: 'Ja, eBudget stöder delade budgetar, vilket gör det enkelt att samarbeta med din familj eller partner för att hantera ekonomi.',
      icon: <UsersIcon className="w-6 h-6 text-red-600" />,
    },
    {
      question: 'Hur anpassar jag mina kategorier i budgeten?',
      answer: 'Du kan redigera, lägga till eller ta bort kategorier direkt i inställningsmenyn under "Budgetkategorier."',
      icon: <AdjustmentsHorizontalIcon className="w-6 h-6 text-purple-600" />,
    },
    {
      question: 'Kan jag få aviseringar om min budget?',
      answer: 'Absolut, aktivera aviseringar i appens inställningar för att få påminnelser om dina mål eller utgifter.',
      icon: <BellIcon className="w-6 h-6 text-teal-600" />,
    },
    {
      question: 'Kan jag exportera mina budgetdata?',
      answer: 'Du kan exportera dina budgetdata som CSV-filer för att använda i andra program eller för säkerhetskopiering.',
      icon: <ArrowDownTrayIcon className="w-6 h-6 text-orange-600" />,
    },
    {
      question: 'Finns det premiumfunktioner i eBudget?',
      answer: 'Ja, med ett premiumkonto får du tillgång till avancerade analyser, rapporter och fler sparverktyg.',
      icon: <SparklesIcon className="w-6 h-6 text-indigo-600" />,
    },
    {
      question: 'Vad gör jag om jag glömt mitt lösenord?',
      answer: 'Klicka på "Glömt lösenord?" på inloggningssidan, så skickar vi instruktioner för att återställa det till din registrerade e-postadress.',
      icon: <KeyIcon className="w-6 h-6 text-gray-600" />,
    },

  ];

  return (
    <div className="relative flex flex-col justify-center items-center min-h-screen">
      {/* FAQ Box */}
      <div className="relative flex flex-col justify-center items-center min-h-screen py-[100px] sm:py-[200px] bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="max-w-4xl w-full bg-white p-10 rounded-lg shadow-lg border-t-8 border-limeGreen">
          {/* Title */}
          <h1 className="text-3xl font-extrabold text-center text-gray-800 mb-6">
            Vanliga frågor
          </h1>
  
          {/* Accordion Section */}
          <div className="space-y-4">
            {questions.map((item, index) => (
              <div
                key={index}
                className="border rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <button
                  className="flex justify-between items-center w-full text-left px-4 py-3 font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none"
                  onClick={() => toggleAccordion(index)}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.question}</span>
                  </div>
                  <ChevronDownIcon
                    className={`w-5 h-5 text-gray-600 transform transition-transform ${
                      activeIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {activeIndex === index && (
                  <div className="px-4 py-2 bg-gray-50 border-t text-gray-600">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
  
            {/* Contact Section */}
            <div className="mt-10 bg-blue-50 p-6 rounded-lg text-center">
              <p className="text-lg font-bold text-blue-600">
                Har du fler frågor? Kontakta oss för att få svar!
                <br />
                <br />
              </p>
              <SubmitButton
                isSubmitting={false}
                label="Kontakta oss"
                size="large"
                enhanceOnHover
                onClick={handleRedirect}
              />
            </div>
          </div>
        </div>
      </div>
  
      {/* Bird Image */}
      <img
        src={faqBird}
        alt="faqBird"
        className=" hidden sm:block mt-10 w-auto max-w-[320px] sm:absolute sm:right-[3%] sm:top-[45%] sm:transform sm:translate-y-[10%] sm:max-w-[320px] 1920:right-[250px] 1920:top-[35%] 1920:max-w-[400px] 3xl:right-[1000px] 3xl:top-[35%] 3xl:max-w-[400px]"
      />
    </div>
  );  
};

export default Faq;
