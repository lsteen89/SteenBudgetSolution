import React from 'react';
import './Faq.css'; // Make sure to import the CSS file
import FaqBird from '../assets/Images/FaqBird.png'; // Adjust the path as needed

function Faq() {
  return (
    <div className="faq-wrapper">
      <div className="faq-container">
        <h1 className="h1-top">Vanliga frågor</h1>
        <div className="faq-content">
          <p>
            <strong>Fråga 1: Hur använder jag eBudget?</strong><br />
            Svar: Vi har utformat eBudget för att vara användarvänlig och intuitiv. 
            Registrera helt enkelt ett konto, fyll i din inkomst och dina utgifter, 
            sätt dina sparande mål och börja budgetera! Om du behöver ytterligare 
            hjälp finns vårt supportteam här för att assistera. Du når oss på 
            support@ebudget.se.
          </p>
          <p>
            <strong>Fråga 2: Är mina data säkra med eBudget?</strong><br />
            Svar: Ja, vi tar säkerheten och integriteten för dina data på allvar. 
            eBudget använder kryptering och följer bästa praxis för att skydda din 
            personliga och finansiella information. Du kan lita på att dina data är 
            säkra hos oss.
          </p>
          <p>
            <strong>Fråga 3: Kan jag komma åt eBudget på olika enheter?</strong><br />
            Svar: Absolut! eBudget är en molnbaserad plattform, vilket innebär att 
            du kan komma åt den från vilken enhet som helst med en internetanslutning. 
            Oavsett om du använder din dator, surfplatta eller smartphone kan du 
            hantera dina ekonomiska medel när som helst och var som helst.
          </p>
          <p>
            <strong>Fråga 4: Vad gör jag om jag stöter på tekniska problem eller har feedback att dela med mig av?</strong><br />
            Svar: Om du stöter på tekniska problem eller har feedback att dela med 
            dig av, tveka inte att kontakta oss genom att använda kontaktformuläret 
            nedan. Vårt dedikerade supportteam kommer snabbt att hjälpa dig och 
            uppskattar all feedback du ger för att hjälpa oss att förbättra vår 
            plattform.
          </p>
        </div>
      </div>
      <img src={FaqBird} alt="Faq Bird" className="faq-bird-image" />
    </div>
  );
}

export default Faq;
