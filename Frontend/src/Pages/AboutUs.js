import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AboutUs.css'; 
import AboutUsBird from '../assets/Images/AboutUsBird.png'; 

function AboutUs() {
  const navigate = useNavigate(); // Initialize the useNavigate hook

  const handleButtonClick = () => {
    navigate('/registration'); // Navigate to the registration page
  };

  return (
    <div className="registration-container">
      <p className="Header">Om oss</p>
      <div className="user-info-form">
        <div className="form-fields">
          {/* Content for About Us Page */}
          <p>
            I en tid präglad av ekonomisk osäkerhet har vi på eBudget insett behovet av ett verktyg som inte bara förenklar budgetering, utan också stärker individer att ta kontroll över sin ekonomi. Vi är dedikerade till att erbjuda en användarvänlig plattform som revolutionerar hur du hanterar dina pengar – från budgetering till sparande och ekonomiskt motståndskraft.
            <br /><br />
            Den ökande inflationen och stigande räntor, tillsammans med en ekonomisk instabilitet på aktiemarknaden, har avslöjat sårbarheter i personlig ekonomi över hela världen. Många kämpade med stigande skulder, ökande kostnader och osäkra framtider. Vi förstod brådskan med en lösning som inte bara förenklar budgetering utan också rustar användare med verktygen för att navigera genom osäkra tider med självförtroende.
            <br /><br />
            Vår plattform erbjuder en sömlös upplevelse för att skapa och hantera budgetar, vilket eliminerar komplexiteterna från traditionella metoder som Excel-kalkylblad. Oavsett om du planerar för en långsemester, sparar till ditt drömhem eller strävar efter att återta kontrollen över din ekonomi, gör eBudget det möjligt att sätta och spåra dina ekonomiska mål utan krångel.
            <br /><br />
            En av de huvudfunktionerna hos eBudget är vårt fokus på att bygga upp en nödfond eller buffert. Vi inser att livet kan vara oförutsägbart, och att ha en ekonomisk säkerhetsnät på plats är avgörande. Vår plattform vägleder dig genom processen att etablera och underhålla din nödfond, vilket ger dig trygghet och stabilitet inför framtiden.
            <br /><br />
            På eBudget erbjuder vi inte bara ett verktyg för budgetering – vi leder en rörelse mot ekonomisk styrka och stabilitet. Gör dig redo att ta kontroll över din ekonomi och skapa en ljusare och tryggare framtid tillsammans med oss.
          </p>
        </div>
        <div className="form-submit">
          <img src={AboutUsBird} alt="AboutUsBird" className="AboutUs-bird-image" />
          <button onClick={handleButtonClick}>Testa gratis!</button>
        </div>
      </div>
    </div>
  );
}

export default AboutUs;
