import type { AppLocale } from "@/types/i18n/appLocale";

export type AuthErrorCode =
  // Auth
  | "Auth.InvalidChallengeToken"
  | "Auth.HumanVerificationRequired"
  | "Auth.InvalidCredentials"
  | "Auth.UserLockedOut"
  | "Auth.LoginFailed"
  | "Auth.ChallengeServiceUnavailable"

  // Registration / Verification
  | "Registration.EmailAlreadyExists"
  | "Registration.EmailExistsUnconfirmed"
  | "Registration.Failed"
  | "Registration.InvalidData"
  | "Registration.HoneypotDetected"
  | "Registration.InvalidVerificationCode"
  | "Registration.VerificationLocked"
  | "Registration.VerificationExpired"
  | "Verification.EmailNotConfirmed"
  | "Verification.TokenNotFound"
  | "Verification.TokenExpired"
  | "Verification.AlreadyVerified"
  | "Verification.UpdateFailed"

  // Password reset
  | "PasswordReset.InvalidToken"
  | "PasswordReset.SamePassword"
  | "PasswordReset.UpdateFailed"

  // Refresh token
  | "RefreshToken.InvalidToken"
  | "RefreshToken.TransactionFailed"
  | "RefreshToken.UserNotFound"

  // Email
  | "Email.SendFailed"
  | "Email.TemplateNotFound"
  | "Email.SendSuccess"

  // User / RateLimit / legacy
  | "User.ValidationFailed"
  | "User.GenericError"
  | "Validation.Failed"
  | "User.EmailAlreadyExists"
  | "RateLimit.Exceeded"
  | "RateLimit.TooManyRequests"
  | "Unknown";

export const sv = {
  // Auth
  "Auth.InvalidChallengeToken": "Verifieringen misslyckades. Försök igen.",
  "Auth.HumanVerificationRequired":
    "Verifiera att du är människa för att fortsätta.",
  "Auth.InvalidCredentials": "Fel e-post eller lösenord.",
  "Auth.UserLockedOut": "Kontot är tillfälligt låst. Försök igen om en stund.",
  "Auth.LoginFailed": "Ett serverfel uppstod vid inloggning. Försök igen.",
  "Auth.ChallengeServiceUnavailable":
    "Verifiering är tillfälligt otillgänglig. Försök snart igen.",

  // Registration
  "Registration.EmailAlreadyExists": "E-posten finns redan.",
  "Registration.EmailExistsUnconfirmed":
    "E-posten finns redan, men är inte verifierad än. Kolla din inkorg och verifiera.",
  "Registration.Failed": "Något gick fel. Försök igen.",
  "Registration.InvalidData": "Kontrollera formuläret och försök igen.",
  "Registration.HoneypotDetected": "Något gick fel. Försök igen.",
  "Registration.InvalidVerificationCode": "Fel kod. Försök igen.",
  "Registration.VerificationLocked":
    "För många försök. Vänta lite och försök igen.",
  "Registration.VerificationExpired": "Koden har gått ut. Be om en ny kod.",

  // Verification
  "Verification.EmailNotConfirmed": "Din e-postadress är inte bekräftad.",
  "Verification.TokenNotFound":
    "Länken är ogiltig eller har redan använts. Be om en ny kod.",
  "Verification.TokenExpired": "Länken har gått ut. Be om en ny kod.",
  "Verification.AlreadyVerified": "E-posten är redan verifierad.",
  "Verification.UpdateFailed": "Verifieringen misslyckades. Försök igen.",

  // Password reset
  "PasswordReset.InvalidToken":
    "Länken är ogiltig eller har gått ut. Be om en ny återställningslänk.",
  "PasswordReset.SamePassword":
    "Nya lösenordet måste vara annorlunda än det gamla.",
  "PasswordReset.UpdateFailed": "Kunde inte uppdatera lösenordet. Försök igen.",

  // Refresh token
  "RefreshToken.InvalidToken": "Din session har gått ut. Logga in igen.",
  "RefreshToken.TransactionFailed":
    "Ett serverfel uppstod. Försök igen om en stund.",
  "RefreshToken.UserNotFound":
    "Vi kunde inte hitta användaren för den här sessionen. Logga in igen.",

  // Email
  "Email.SendFailed": "Kunde inte skicka e-post just nu. Försök igen senare.",
  "Email.TemplateNotFound": "Kunde inte skicka e-post. Försök igen senare.",
  "Email.SendSuccess": "E-post skickad.",

  // User / RateLimit / legacy
  "User.ValidationFailed": "Kontrollera formuläret och försök igen.",
  "User.GenericError": "Något gick fel. Försök igen senare.",
  "Validation.Failed": "Kontrollera formuläret och försök igen.",
  "User.EmailAlreadyExists": "E-posten finns redan.",
  "RateLimit.Exceeded": "För många försök. Vänta en stund och försök igen.",
  "RateLimit.TooManyRequests":
    "För många försök. Vänta en stund och försök igen.",

  Unknown: "Något gick fel. Försök igen.",
} satisfies Record<AuthErrorCode, string>;

export const en = {
  // Auth
  "Auth.InvalidChallengeToken": "Verification failed. Please try again.",
  "Auth.HumanVerificationRequired": "Please verify you are human to continue.",
  "Auth.InvalidCredentials": "Incorrect email or password.",
  "Auth.UserLockedOut":
    "This account is temporarily locked. Please try again later.",
  "Auth.LoginFailed": "A server error occurred during login. Please try again.",
  "Auth.ChallengeServiceUnavailable":
    "Verification is temporarily unavailable. Please try again soon.",

  // Registration
  "Registration.EmailAlreadyExists": "That email is already in use.",
  "Registration.EmailExistsUnconfirmed":
    "That email already exists, but it isn’t verified yet. Check your inbox and verify.",
  "Registration.Failed": "Something went wrong. Please try again.",
  "Registration.InvalidData": "Please check the form and try again.",
  "Registration.HoneypotDetected": "Something went wrong. Please try again.",
  "Registration.InvalidVerificationCode": "Invalid code. Please try again.",
  "Registration.VerificationLocked":
    "Too many attempts. Please try again later.",
  "Registration.VerificationExpired":
    "The code has expired. Please request a new code.",

  // Verification
  "Verification.EmailNotConfirmed": "Your email address is not confirmed.",
  "Verification.TokenNotFound":
    "This link is invalid or already used. Please request a new code.",
  "Verification.TokenExpired":
    "This link has expired. Please request a new code.",
  "Verification.AlreadyVerified": "This email is already verified.",
  "Verification.UpdateFailed": "Verification failed. Please try again.",

  // Password reset
  "PasswordReset.InvalidToken":
    "This link is invalid or expired. Please request a new reset link.",
  "PasswordReset.SamePassword":
    "Your new password must be different from the old one.",
  "PasswordReset.UpdateFailed":
    "Could not update the password. Please try again.",

  // Refresh token
  "RefreshToken.InvalidToken":
    "Your session has expired. Please sign in again.",
  "RefreshToken.TransactionFailed":
    "A server error occurred. Please try again in a moment.",
  "RefreshToken.UserNotFound":
    "We couldn’t find the user for this session. Please sign in again.",

  // Email
  "Email.SendFailed":
    "Couldn’t send the email right now. Please try again later.",
  "Email.TemplateNotFound": "Couldn’t send the email. Please try again later.",
  "Email.SendSuccess": "Email sent.",

  // User / RateLimit / legacy
  "User.ValidationFailed": "Please check the form and try again.",
  "User.GenericError": "Something went wrong. Please try again later.",
  "Validation.Failed": "Please check the form and try again.",
  "User.EmailAlreadyExists": "That email is already in use.",
  "RateLimit.Exceeded": "Too many attempts. Please try again later.",
  "RateLimit.TooManyRequests": "Too many attempts. Please try again later.",

  Unknown: "Something went wrong. Please try again.",
} satisfies Record<AuthErrorCode, string>;

export const et = {
  // Auth
  "Auth.InvalidChallengeToken": "Kinnitamine ebaõnnestus. Proovi uuesti.",
  "Auth.HumanVerificationRequired": "Jätkamiseks kinnita, et oled inimene.",
  "Auth.InvalidCredentials": "Vale e-post või parool.",
  "Auth.UserLockedOut": "Konto on ajutiselt lukustatud. Proovi hiljem uuesti.",
  "Auth.LoginFailed": "Sisselogimisel tekkis serveriviga. Proovi uuesti.",
  "Auth.ChallengeServiceUnavailable":
    "Kinnitamine on ajutiselt kättesaamatu. Proovi varsti uuesti.",

  // Registration
  "Registration.EmailAlreadyExists": "See e-post on juba kasutusel.",
  "Registration.EmailExistsUnconfirmed":
    "See e-post on juba olemas, kuid pole veel kinnitatud. Kontrolli postkasti ja kinnita.",
  "Registration.Failed": "Midagi läks valesti. Proovi uuesti.",
  "Registration.InvalidData": "Palun kontrolli vormi ja proovi uuesti.",
  "Registration.HoneypotDetected": "Midagi läks valesti. Proovi uuesti.",
  "Registration.InvalidVerificationCode": "Vale kood. Proovi uuesti.",
  "Registration.VerificationLocked":
    "Liiga palju katseid. Oota veidi ja proovi uuesti.",
  "Registration.VerificationExpired": "Kood on aegunud. Palun küsi uus kood.",

  // Verification
  "Verification.EmailNotConfirmed": "Sinu e-posti aadress ei ole kinnitatud.",
  "Verification.TokenNotFound":
    "Link on vigane või juba kasutatud. Palun küsi uus kood.",
  "Verification.TokenExpired": "Link on aegunud. Palun küsi uus kood.",
  "Verification.AlreadyVerified": "E-post on juba kinnitatud.",
  "Verification.UpdateFailed": "Kinnitamine ebaõnnestus. Proovi uuesti.",

  // Password reset
  "PasswordReset.InvalidToken":
    "Link on vigane või aegunud. Palun küsi uus lähtestuslink.",
  "PasswordReset.SamePassword": "Uus parool peab erinema vanast paroolist.",
  "PasswordReset.UpdateFailed":
    "Parooli ei õnnestunud uuendada. Proovi uuesti.",

  // Refresh token
  "RefreshToken.InvalidToken":
    "Sinu sessioon on aegunud. Palun logi uuesti sisse.",
  "RefreshToken.TransactionFailed":
    "Tekkis serveriviga. Proovi mõne aja pärast uuesti.",
  "RefreshToken.UserNotFound":
    "Selle sessiooni kasutajat ei leitud. Palun logi uuesti sisse.",

  // Email
  "Email.SendFailed":
    "E-kirja ei õnnestunud praegu saata. Proovi hiljem uuesti.",
  "Email.TemplateNotFound":
    "E-kirja ei õnnestunud saata. Proovi hiljem uuesti.",
  "Email.SendSuccess": "E-kiri on saadetud.",

  // User / RateLimit / legacy
  "User.ValidationFailed": "Palun kontrolli vormi ja proovi uuesti.",
  "User.GenericError": "Midagi läks valesti. Proovi hiljem uuesti.",
  "Validation.Failed": "Palun kontrolli vormi ja proovi uuesti.",
  "User.EmailAlreadyExists": "See e-post on juba kasutusel.",
  "RateLimit.Exceeded": "Liiga palju katseid. Proovi hiljem uuesti.",
  "RateLimit.TooManyRequests": "Liiga palju katseid. Proovi hiljem uuesti.",

  Unknown: "Midagi läks valesti. Proovi uuesti.",
} satisfies Record<AuthErrorCode, string>;

const KNOWN: readonly AuthErrorCode[] = Object.keys(sv) as AuthErrorCode[];

export function asAuthErrorCode(raw: unknown): AuthErrorCode {
  const s = String(raw ?? "").trim();
  return (KNOWN as readonly string[]).includes(s)
    ? (s as AuthErrorCode)
    : "Unknown";
}

export function labelAuthError(code: AuthErrorCode, locale: AppLocale) {
  const table = locale.startsWith("sv")
    ? sv
    : locale.startsWith("et")
      ? et
      : en;
  return table[code];
}
