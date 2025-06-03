const backendErrorTranslations: Record<string, string> = {
  "Invalid credentials.": "Felaktig e-postadress eller lösenord.",
  "Email not confirmed.": "E-postadressen är inte bekräftad. Kontrollera din inkorg.",
   "Account locked.": "Ditt konto är låst. Kontakta supporten för hjälp.",
  "Login failed": "Inloggningen misslyckades. Försök igen.", 
  "Network Error": "Nätverksfel. Kontrollera din anslutning och försök igen.",

};

export const translateBackendError = (englishMessage?: string): string => {
  if (!englishMessage) {
    return "Ett okänt fel inträffade."; // Default Swedish error
  }
  return backendErrorTranslations[englishMessage] || englishMessage; // Fallback to English if no translation
};