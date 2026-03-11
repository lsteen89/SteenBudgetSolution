export const apiErrorsDict = {
  sv: {
    network: "Kunde inte nå servern. Kontrollera anslutningen och försök igen.",
    rateLimitFallback: "en stund",
    rateLimit: "För många försök. Vänta {retryAfter} och försök igen.",
    server: "Serverfel. Försök igen om en stund.",
  },
  en: {
    network: "Could not reach the server. Check your connection and try again.",
    rateLimitFallback: "a moment",
    rateLimit: "Too many attempts. Wait {retryAfter} and try again.",
    server: "Server error. Please try again in a moment.",
  },
  et: {
    network:
      "Serveriga ei õnnestunud ühendust luua. Kontrolli ühendust ja proovi uuesti.",
    rateLimitFallback: "hetk",
    rateLimit: "Liiga palju katseid. Oota {retryAfter} ja proovi uuesti.",
    server: "Serveri viga. Proovi natukese aja pärast uuesti.",
  },
};
