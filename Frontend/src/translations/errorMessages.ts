const backendErrorTranslations: Record<string, string> = {
  // Auth
  'Auth.InvalidCredentials': 'Fel e-postadress eller lösenord.',
  'Auth.EmailNotVerified': 'Du måste verifiera din e-post innan du kan logga in.',
  'Auth.LockedOut': 'Kontot är tillfälligt låst på grund av för många försök.',

  // Generic validation
  'Validation.Error': 'Några fält är ogiltiga. Kontrollera formuläret och försök igen.',

  // Server
  'Server.Error': 'Ett oväntat fel inträffade. Försök igen senare.',

};

export const translateBackendError = (englishMessage?: string): string => {
  if (!englishMessage) {
    return "Ett okänt fel inträffade."; // Default Swedish error
  }
  return backendErrorTranslations[englishMessage] || englishMessage; // Fallback to English if no translation
};