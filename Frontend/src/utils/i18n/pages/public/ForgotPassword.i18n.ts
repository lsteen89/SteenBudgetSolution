export const forgotPasswordDict = {
  sv: {
    kicker: "KONTOÅTERSTÄLLNING",
    titleA: "Glömt ditt",
    titleB: "lösenord?",
    lead: "Ange din e-postadress så skickar vi instruktioner för att återställa lösenordet.",
    leadSubmitted:
      "Om adressen finns registrerad har vi skickat instruktioner för återställning.",
    email: "E-postadress",
    emailPlaceholder: "Ange din e-postadress",
    submitIdle: "Skicka återställningslänk",
    submitBusy: "Skickar...",
    backToLogin: "Tillbaka till inloggning",
    needHelp: "Behöver du hjälp?",
    privacyNote:
      "Av säkerhetsskäl visar vi inte om en viss e-postadress finns registrerad.",
    successBody:
      "Kontrollera din inkorg och även skräppostmappen. Om adressen finns hos oss får du snart ett mejl med nästa steg.",
    toastSuccess: "Om adressen finns registrerad har vi skickat instruktioner.",
    toastGenericError: "Något gick fel. Försök igen om en liten stund.",
  },
  en: {
    kicker: "ACCOUNT RECOVERY",
    titleA: "Forgot your",
    titleB: "password?",
    lead: "Enter your email address and we’ll send password reset instructions.",
    leadSubmitted:
      "If the address exists in our system, we’ve sent reset instructions.",
    email: "Email address",
    emailPlaceholder: "Enter your email address",
    submitIdle: "Send reset link",
    submitBusy: "Sending...",
    backToLogin: "Back to login",
    needHelp: "Need help?",
    privacyNote:
      "For security reasons, we do not reveal whether an email address is registered.",
    successBody:
      "Check your inbox and spam folder. If the address exists with us, you’ll receive an email shortly.",
    toastSuccess:
      "If the address exists in our system, we’ve sent instructions.",
    toastGenericError: "Something went wrong. Please try again in a moment.",
  },
  et: {
    kicker: "KONTO TAASTAMINE",
    titleA: "Unustasid oma",
    titleB: "parooli?",
    lead: "Sisesta oma e-posti aadress ja saadame sulle parooli lähtestamise juhised.",
    leadSubmitted:
      "Kui see aadress on meie süsteemis olemas, saatsime lähtestamise juhised.",
    email: "E-posti aadress",
    emailPlaceholder: "Sisesta oma e-posti aadress",
    submitIdle: "Saada lähtestamise link",
    submitBusy: "Saadan...",
    backToLogin: "Tagasi sisselogimisse",
    needHelp: "Vajad abi?",
    privacyNote:
      "Turvalisuse huvides me ei avalda, kas e-posti aadress on registreeritud.",
    successBody:
      "Kontrolli oma postkasti ja rämpsposti kausta. Kui aadress on meie süsteemis olemas, saad peagi e-kirja järgmiste sammudega.",
    toastSuccess: "Kui aadress on meie süsteemis olemas, saatsime juhised.",
    toastGenericError: "Midagi läks valesti. Proovi hetke pärast uuesti.",
  },
} as const;
