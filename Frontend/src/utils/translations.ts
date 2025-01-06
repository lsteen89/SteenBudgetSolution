type Language = 'en' | 'sv';

interface Translations {
    [key: string]: {
        [key: string]: string;
    };
}

const translations: Record<string, string> = {
    "Password successfully updated.": "Lösenordet har ändrats!",
    "Invalid or expired token.": "Felaktig eller utgången återställningslänk. Försök igen eller kontakta support.",
    "New password cannot be the same as the old password.": "Nytt lösenord får inte vara samma som det nuvarande lösenordet.",
    "Failed to update password. Please try again.": "Misslyckades med att uppdatera lösenordet. Försök igen.",
    "Email verification successful.": "E-postverifiering lyckades.",
    "Email is already verifierad.": "E-post är redan verifierad.",
    "Email verification failed. Please try again.": "E-postverifiering misslyckades. Försök igen.",
  };
  
  export default translations;
  
  
