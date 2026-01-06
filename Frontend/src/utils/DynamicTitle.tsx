import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DynamicTitle = () => {
  const location = useLocation();

  useEffect(() => {
    const titles: { [key: string]: string } = {
      "/": "eBudget - Förenkla din budget",
      "/registration": "eBudget - Registrering",
      "/check-email": "eBudget - Kontrollera e-post",
      "/email-confirmation": "eBudget - E-postbekräftelse",
      "/about-us": "eBudget - Om oss",
      "/forgotpassword": "eBudget - Glömt lösenord",
      "/contact": "eBudget - Kontakta oss",
      "/faq": "eBudget - Vanliga frågor",
      "/login": "eBudget - Logga in",
      "/reset-password": "eBudget - Återställ lösenord",
      "/dashboard": "eBudget - Dashboard",
      "/expenses": "eBudget - Utgifter",
      "/dashboard/breakdown": "eBudget - Utgiftsöversikt",
    };

    // Set the title or fallback to "eBudget"
    document.title = titles[location.pathname] || "eBudget - Sida ej hittad";
  }, [location]);

  return null;
};

export default DynamicTitle;
