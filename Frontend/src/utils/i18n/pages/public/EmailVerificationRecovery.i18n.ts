export const recoveryDict = {
  sv: {
    topHint: "Verifiering och åtkomst",
    navLogin: "Logga in",
    navRegister: "Skapa konto",
    title: "Fortsätt verifiera ditt konto",
    lead: "Om du tappade din session eller bytte enhet kan du begära en ny verifieringskod här. Logga sedan in för att fortsätta verifieringen.",
    howTitle: "Så fungerar det",
    howBody:
      "Ange din e-postadress så skickar vi en ny kod om ett konto finns. Därefter loggar du in och fortsätter på verifieringssidan.",
    emailLabel: "E-postadress",
    emailPlaceholder: "namn@exempel.se",
    submitIdle: "Skicka ny kod",
    submitBusy: "Skickar…",
    loginCta: "Till inloggning",
    footnote:
      "Av säkerhetsskäl verifierar du själva koden först efter att du har loggat in igen.",
    backToRegister: "Tillbaka till registrering",
    yupEmailRequired: "Ange din e-postadress.",
    yupEmailInvalid: "Ange en giltig e-postadress.",
    toastRecoverySent:
      "Om kontot finns har vi skickat en ny kod. Logga in för att fortsätta.",
  },
  en: {
    topHint: "Verification and access",
    navLogin: "Log in",
    navRegister: "Create account",
    title: "Continue verifying your account",
    lead: "If you lost your session or changed device, you can request a new verification code here. Then log in to continue verification.",
    howTitle: "How it works",
    howBody:
      "Enter your email address and we will send a new code if an account exists. After that, log in and continue on the verification page.",
    emailLabel: "Email address",
    emailPlaceholder: "name@example.com",
    submitIdle: "Send new code",
    submitBusy: "Sending…",
    loginCta: "Go to login",
    footnote:
      "For security reasons, the actual code verification happens after you log in again.",
    backToRegister: "Back to registration",
    yupEmailRequired: "Enter your email address.",
    yupEmailInvalid: "Enter a valid email address.",
    toastRecoverySent:
      "If the account exists, we sent a new code. Log in to continue.",
  },
  et: {
    topHint: "Kinnitamine ja ligipääs",
    navLogin: "Logi sisse",
    navRegister: "Loo konto",
    title: "Jätka oma konto kinnitamist",
    lead: "Kui kaotasid sessiooni või vahetasid seadet, saad siin küsida uue kinnituskoodi. Seejärel logi sisse, et kinnitamist jätkata.",
    howTitle: "Kuidas see töötab",
    howBody:
      "Sisesta oma e-posti aadress ja olemasoleva konto korral saadame uue koodi. Pärast seda logi sisse ja jätka kinnitamislehel.",
    emailLabel: "E-posti aadress",
    emailPlaceholder: "nimi@naide.ee",
    submitIdle: "Saada uus kood",
    submitBusy: "Saadan…",
    loginCta: "Mine sisselogimisse",
    footnote:
      "Turvalisuse huvides toimub koodi tegelik kinnitamine alles pärast uuesti sisselogimist.",
    backToRegister: "Tagasi registreerimisele",
    yupEmailRequired: "Sisesta oma e-posti aadress.",
    yupEmailInvalid: "Sisesta kehtiv e-posti aadress.",
    toastRecoverySent:
      "Kui konto on olemas, saatsime uue koodi. Jätkamiseks logi sisse.",
  },
} as const;
