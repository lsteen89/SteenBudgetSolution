import type { AppLocale } from "@/types/i18n/appLocale";

export const API_ERROR_CODES = [
  // Auth / session
  "Auth.InvalidChallengeToken",
  "Auth.HumanVerificationRequired",
  "Auth.InvalidCredentials",
  "Auth.UserLockedOut",
  "Auth.LoginFailed",
  "Auth.InvalidToken",
  "Auth.EmailMissing",
  "Auth.CurrentPasswordRequired",
  "Auth.NewPasswordInvalid",
  "Auth.InvalidCurrentPassword",
  "Auth.PasswordUpdateFailed",

  // Registration / verification
  "Registration",
  "Registration.EmailAlreadyExists",
  "Registration.EmailExistsUnconfirmed",
  "Registration.Failed",
  "Registration.InvalidData",
  "Registration.HoneypotDetected",
  "Registration.InvalidVerificationCode",
  "Registration.VerificationLocked",
  "Registration.VerificationExpired",
  "Verification.EmailNotConfirmed",
  "Verification.TokenNotFound",
  "Verification.TokenExpired",
  "Verification.AlreadyVerified",
  "Verification.UpdateFailed",

  // Password reset / refresh token
  "PasswordReset.InvalidToken",
  "PasswordReset.InvalidOrExpired",
  "PasswordReset.SamePassword",
  "PasswordReset.UpdateFailed",
  "RefreshToken.InvalidToken",
  "RefreshToken.TransactionFailed",
  "RefreshToken.UserNotFound",

  // Email / support
  "Email.SendFailed",
  "Email.TemplateNotFound",
  "Email.SendSuccess",
  "Support.ValidationFailed",
  "Support.UserNotFound",
  "Support.QueueFailed",

  // User / preferences
  "User.ValidationFailed",
  "User.GenericError",
  "User.NotFound",
  "User.FirstNameRequired",
  "User.LastNameRequired",
  "User.ProfileUpdateFailed",
  "User.NotFoundAfterUpdate",
  "User.EmailAlreadyExists",
  "UserPreferences.NotFound",
  "UserPreferences.InvalidCurrency",
  "UserPreferences.UpdateFailed",

  // Budget
  "Budget.NotFound",
  "BudgetMonth.InvalidYearMonth",
  "BudgetMonth.InvalidCarryMode",
  "BudgetMonth.InvalidCarryAmount",
  "BudgetMonth.OpenMonthExists",
  "BudgetMonth.MonthIsClosed",
  "BudgetMonth.InvalidTargetMonth",
  "BudgetMonth.MonthNotFound",
  "BudgetMonth.SnapshotMissing",
  "BUDGET_NOT_FOUND",

  // Wizard
  "Wizard.SessionNotFound",
  "Wizard.NoData",
  "Wizard.CreateFailed",
  "Wizard.ValidatorNotFound",
  "Wizard.NullData",
  "Wizard.TargetMissing",
  "Wizard.ProcessorNotFound",
  "Debt.JsonError",
  "Debt.InvalidData",
  "Income.JsonError",
  "Income.InvalidData",
  "Savings.JsonError",
  "Savings.InvalidData",
  "Expenditure.JsonError",
  "Expenditure.InvalidData",

  // Infrastructure / validation
  "Validation.Failed",
  "Validation.Error",
  "Serialization.Failed",
  "Token.Invalid",
  "Database.Error",
  "Database.SaveFailed",
  "Request.Canceled",
  "Server.Error",
  "RateLimit.Exceeded",
  "RateLimit.TooManyRequests",

  "Unknown",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

const sv = {
  "Auth.InvalidChallengeToken": "Verifieringen misslyckades. Forsok igen.",
  "Auth.HumanVerificationRequired":
    "Verifiera att du ar en manniska for att fortsatta.",
  "Auth.InvalidCredentials": "Fel e-post eller losenord.",
  "Auth.UserLockedOut": "Kontot ar tillfalligt last. Forsok igen om en stund.",
  "Auth.LoginFailed": "Ett serverfel uppstod vid inloggning. Forsok igen.",
  "Auth.InvalidToken": "Din session ar ogiltig. Logga in igen.",
  "Auth.EmailMissing":
    "Din session saknar nodvandig kontoinformation. Logga in igen.",
  "Auth.CurrentPasswordRequired": "Ange ditt nuvarande losenord.",
  "Auth.NewPasswordInvalid":
    "Det nya losenordet ar ogiltigt. Kontrollera kraven och forsok igen.",
  "Auth.InvalidCurrentPassword": "Nuvarande losenord ar felaktigt.",
  "Auth.PasswordUpdateFailed":
    "Kunde inte uppdatera losenordet. Forsok igen.",

  "Registration": "Registrering ar inte tillaten for denna begaran.",
  "Registration.EmailAlreadyExists": "E-posten finns redan.",
  "Registration.EmailExistsUnconfirmed":
    "E-posten finns redan, men ar inte verifierad an. Kontrollera din inkorg.",
  "Registration.Failed": "Nagot gick fel vid registreringen. Forsok igen.",
  "Registration.InvalidData": "Kontrollera formularet och forsok igen.",
  "Registration.HoneypotDetected": "Nagot gick fel. Forsok igen.",
  "Registration.InvalidVerificationCode": "Fel kod. Forsok igen.",
  "Registration.VerificationLocked":
    "For manga forsok. Vanta lite och forsok igen.",
  "Registration.VerificationExpired": "Koden har gatt ut. Be om en ny kod.",
  "Verification.EmailNotConfirmed": "Din e-postadress ar inte bekraftad.",
  "Verification.TokenNotFound":
    "Lanken ar ogiltig eller har redan anvants. Be om en ny kod.",
  "Verification.TokenExpired": "Lanken har gatt ut. Be om en ny kod.",
  "Verification.AlreadyVerified": "E-posten ar redan verifierad.",
  "Verification.UpdateFailed": "Verifieringen misslyckades. Forsok igen.",

  "PasswordReset.InvalidToken":
    "Lanken ar ogiltig eller har gatt ut. Be om en ny aterstallningslank.",
  "PasswordReset.InvalidOrExpired":
    "Aterstallningsbegaran ar ogiltig eller har gatt ut. Be om en ny lank.",
  "PasswordReset.SamePassword":
    "Det nya losenordet maste skilja sig fran det gamla.",
  "PasswordReset.UpdateFailed":
    "Kunde inte uppdatera losenordet. Forsok igen.",
  "RefreshToken.InvalidToken": "Din session har gatt ut. Logga in igen.",
  "RefreshToken.TransactionFailed":
    "Ett serverfel uppstod. Forsok igen om en stund.",
  "RefreshToken.UserNotFound":
    "Vi kunde inte hitta anvandaren for den har sessionen. Logga in igen.",

  "Email.SendFailed": "Kunde inte skicka e-post just nu. Forsok igen senare.",
  "Email.TemplateNotFound":
    "Kunde inte skicka e-post. Forsok igen senare.",
  "Email.SendSuccess": "E-post skickad.",
  "Support.ValidationFailed":
    "Kontrollera supportmeddelandet och forsok igen.",
  "Support.UserNotFound":
    "Vi kunde inte hitta ditt konto. Logga in igen och forsok igen.",
  "Support.QueueFailed":
    "Kunde inte skicka supportmeddelandet just nu. Forsok igen senare.",

  "User.ValidationFailed": "Kontrollera formularet och forsok igen.",
  "User.GenericError": "Nagot gick fel. Forsok igen senare.",
  "User.NotFound": "Anvandaren kunde inte hittas.",
  "User.FirstNameRequired": "Ange fornamn.",
  "User.LastNameRequired": "Ange efternamn.",
  "User.ProfileUpdateFailed":
    "Kunde inte uppdatera din profil. Forsok igen.",
  "User.NotFoundAfterUpdate":
    "Profilen uppdaterades men kunde inte laddas igen. Forsok igen.",
  "User.EmailAlreadyExists": "E-posten finns redan.",
  "UserPreferences.NotFound": "Kunde inte hitta dina installningar.",
  "UserPreferences.InvalidCurrency": "Valutan ar ogiltig.",
  "UserPreferences.UpdateFailed":
    "Kunde inte spara dina installningar. Forsok igen.",

  "Budget.NotFound": "Ingen budget hittades for det har kontot.",
  "BudgetMonth.InvalidYearMonth":
    "Ogiltigt manadsformat. Anvand formatet YYYY-MM.",
  "BudgetMonth.InvalidCarryMode":
    "Ogiltigt overforingslage. Kontrollera valet och forsok igen.",
  "BudgetMonth.InvalidCarryAmount":
    "Ogiltigt overforingsbelopp. Kontrollera beloppet och forsok igen.",
  "BudgetMonth.OpenMonthExists":
    "Det finns redan en oppen manad som maste stangas forst.",
  "BudgetMonth.MonthIsClosed": "Den har manaden ar redan stangd.",
  "BudgetMonth.InvalidTargetMonth":
    "Malmanaden kan inte ligga fore den oppna manaden.",
  "BudgetMonth.MonthNotFound": "Den valda budgetmanaden kunde inte hittas.",
  "BudgetMonth.SnapshotMissing":
    "Stangd manadsdata saknas. Forsok igen eller kontakta support.",
  BUDGET_NOT_FOUND: "Ingen budget hittades for det har kontot.",

  "Wizard.SessionNotFound": "Guidesessionen kunde inte hittas.",
  "Wizard.NoData": "Ingen guideinformation hittades.",
  "Wizard.CreateFailed": "Kunde inte starta guiden. Forsok igen.",
  "Wizard.ValidatorNotFound":
    "Det har steget kan inte sparas just nu. Forsok igen.",
  "Wizard.NullData": "Stegdata saknas. Forsok igen.",
  "Wizard.TargetMissing":
    "Det har steget kunde inte behandlas. Forsok igen.",
  "Wizard.ProcessorNotFound":
    "Det har steget kunde inte behandlas. Forsok igen.",
  "Debt.JsonError": "Skulddata har fel format. Kontrollera och forsok igen.",
  "Debt.InvalidData": "Kontrollera skulduppgifterna och forsok igen.",
  "Income.JsonError": "Inkomstdata har fel format. Kontrollera och forsok igen.",
  "Income.InvalidData": "Kontrollera inkomstuppgifterna och forsok igen.",
  "Savings.JsonError":
    "Sparandedata har fel format. Kontrollera och forsok igen.",
  "Savings.InvalidData":
    "Kontrollera sparuppgifterna och forsok igen.",
  "Expenditure.JsonError":
    "Utgiftsdata har fel format. Kontrollera och forsok igen.",
  "Expenditure.InvalidData":
    "Kontrollera utgiftsuppgifterna och forsok igen.",

  "Validation.Failed": "Kontrollera formularet och forsok igen.",
  "Validation.Error": "Kontrollera formularet och forsok igen.",
  "Serialization.Failed":
    "Data kunde inte behandlas. Forsok igen om en stund.",
  "Token.Invalid": "Din session ar ogiltig. Logga in igen.",
  "Database.Error": "Kunde inte spara dina uppgifter just nu. Forsok igen.",
  "Database.SaveFailed": "Kunde inte spara andringarna. Forsok igen.",
  "Request.Canceled": "Begaran avbrots. Forsok igen.",
  "Server.Error": "Ett ovantat serverfel uppstod. Forsok igen.",
  "RateLimit.Exceeded": "For manga forsok. Vanta en stund och forsok igen.",
  "RateLimit.TooManyRequests":
    "For manga forsok. Vanta en stund och forsok igen.",

  Unknown: "Nagot gick fel. Forsok igen.",
} satisfies Record<ApiErrorCode, string>;

const en = {
  "Auth.InvalidChallengeToken": "Verification failed. Please try again.",
  "Auth.HumanVerificationRequired": "Please verify you are human to continue.",
  "Auth.InvalidCredentials": "Incorrect email or password.",
  "Auth.UserLockedOut":
    "This account is temporarily locked. Please try again later.",
  "Auth.LoginFailed": "A server error occurred during login. Please try again.",
  "Auth.InvalidToken": "Your session is invalid. Please sign in again.",
  "Auth.EmailMissing":
    "Your session is missing required account details. Please sign in again.",
  "Auth.CurrentPasswordRequired": "Enter your current password.",
  "Auth.NewPasswordInvalid":
    "Your new password is invalid. Check the requirements and try again.",
  "Auth.InvalidCurrentPassword": "Your current password is incorrect.",
  "Auth.PasswordUpdateFailed":
    "Could not update the password. Please try again.",

  Registration: "Registration is not allowed for this request.",
  "Registration.EmailAlreadyExists": "That email is already in use.",
  "Registration.EmailExistsUnconfirmed":
    "That email already exists, but it is not verified yet. Check your inbox.",
  "Registration.Failed":
    "Something went wrong during registration. Please try again.",
  "Registration.InvalidData": "Please check the form and try again.",
  "Registration.HoneypotDetected": "Something went wrong. Please try again.",
  "Registration.InvalidVerificationCode": "Invalid code. Please try again.",
  "Registration.VerificationLocked":
    "Too many attempts. Please try again later.",
  "Registration.VerificationExpired":
    "The code has expired. Please request a new code.",
  "Verification.EmailNotConfirmed": "Your email address is not confirmed.",
  "Verification.TokenNotFound":
    "This link is invalid or has already been used. Please request a new code.",
  "Verification.TokenExpired":
    "This link has expired. Please request a new code.",
  "Verification.AlreadyVerified": "This email is already verified.",
  "Verification.UpdateFailed": "Verification failed. Please try again.",

  "PasswordReset.InvalidToken":
    "This reset link is invalid or expired. Please request a new one.",
  "PasswordReset.InvalidOrExpired":
    "This reset request is invalid or expired. Please request a new one.",
  "PasswordReset.SamePassword":
    "Your new password must be different from the old one.",
  "PasswordReset.UpdateFailed":
    "Could not update the password. Please try again.",
  "RefreshToken.InvalidToken":
    "Your session has expired. Please sign in again.",
  "RefreshToken.TransactionFailed":
    "A server error occurred. Please try again in a moment.",
  "RefreshToken.UserNotFound":
    "We could not find the user for this session. Please sign in again.",

  "Email.SendFailed":
    "Could not send the email right now. Please try again later.",
  "Email.TemplateNotFound":
    "Could not send the email. Please try again later.",
  "Email.SendSuccess": "Email sent.",
  "Support.ValidationFailed":
    "Please check your support message and try again.",
  "Support.UserNotFound":
    "We could not identify your account. Please sign in again and retry.",
  "Support.QueueFailed":
    "Could not queue the support message right now. Please try again later.",

  "User.ValidationFailed": "Please check the form and try again.",
  "User.GenericError": "Something went wrong. Please try again later.",
  "User.NotFound": "User not found.",
  "User.FirstNameRequired": "Enter your first name.",
  "User.LastNameRequired": "Enter your last name.",
  "User.ProfileUpdateFailed":
    "Could not update your profile. Please try again.",
  "User.NotFoundAfterUpdate":
    "Your profile was updated, but we could not reload it. Please try again.",
  "User.EmailAlreadyExists": "That email is already in use.",
  "UserPreferences.NotFound": "Could not find your preferences.",
  "UserPreferences.InvalidCurrency": "The selected currency is invalid.",
  "UserPreferences.UpdateFailed":
    "Could not save your preferences. Please try again.",

  "Budget.NotFound": "No budget was found for this account.",
  "BudgetMonth.InvalidYearMonth":
    "Invalid month format. Use the format YYYY-MM.",
  "BudgetMonth.InvalidCarryMode":
    "Invalid carry-over mode. Check the selection and try again.",
  "BudgetMonth.InvalidCarryAmount":
    "Invalid carry-over amount. Check the amount and try again.",
  "BudgetMonth.OpenMonthExists":
    "An open month already exists and must be closed first.",
  "BudgetMonth.MonthIsClosed": "This month is already closed.",
  "BudgetMonth.InvalidTargetMonth":
    "The target month cannot be before the current open month.",
  "BudgetMonth.MonthNotFound": "The selected budget month was not found.",
  "BudgetMonth.SnapshotMissing":
    "The closed-month snapshot is missing. Please try again or contact support.",
  BUDGET_NOT_FOUND: "No budget was found for this account.",

  "Wizard.SessionNotFound": "The wizard session was not found.",
  "Wizard.NoData": "No wizard data was found.",
  "Wizard.CreateFailed": "Could not start the wizard. Please try again.",
  "Wizard.ValidatorNotFound":
    "This step cannot be saved right now. Please try again.",
  "Wizard.NullData": "Step data is missing. Please try again.",
  "Wizard.TargetMissing":
    "This step could not be processed. Please try again.",
  "Wizard.ProcessorNotFound":
    "This step could not be processed. Please try again.",
  "Debt.JsonError":
    "Debt data has an invalid format. Please check it and try again.",
  "Debt.InvalidData": "Please check the debt details and try again.",
  "Income.JsonError":
    "Income data has an invalid format. Please check it and try again.",
  "Income.InvalidData": "Please check the income details and try again.",
  "Savings.JsonError":
    "Savings data has an invalid format. Please check it and try again.",
  "Savings.InvalidData": "Please check the savings details and try again.",
  "Expenditure.JsonError":
    "Expense data has an invalid format. Please check it and try again.",
  "Expenditure.InvalidData": "Please check the expense details and try again.",

  "Validation.Failed": "Please check the form and try again.",
  "Validation.Error": "Please check the form and try again.",
  "Serialization.Failed":
    "The data could not be processed. Please try again in a moment.",
  "Token.Invalid": "Your session is invalid. Please sign in again.",
  "Database.Error":
    "Could not save your data right now. Please try again later.",
  "Database.SaveFailed":
    "Could not save your changes. Please try again.",
  "Request.Canceled": "The request was canceled. Please try again.",
  "Server.Error": "An unexpected server error occurred. Please try again.",
  "RateLimit.Exceeded": "Too many attempts. Please try again later.",
  "RateLimit.TooManyRequests": "Too many attempts. Please try again later.",

  Unknown: "Something went wrong. Please try again.",
} satisfies Record<ApiErrorCode, string>;

const et = {
  "Auth.InvalidChallengeToken": "Kinnitamine ebaonnestus. Proovi uuesti.",
  "Auth.HumanVerificationRequired": "Jatkamiseks kinnita, et oled inimene.",
  "Auth.InvalidCredentials": "Vale e-post voi parool.",
  "Auth.UserLockedOut": "Konto on ajutiselt lukustatud. Proovi hiljem uuesti.",
  "Auth.LoginFailed": "Sisselogimisel tekkis serveriviga. Proovi uuesti.",
  "Auth.InvalidToken": "Sinu sessioon on vigane. Palun logi uuesti sisse.",
  "Auth.EmailMissing":
    "Sinu sessioonist puudub vajalik kontoinfo. Palun logi uuesti sisse.",
  "Auth.CurrentPasswordRequired": "Sisesta oma praegune parool.",
  "Auth.NewPasswordInvalid":
    "Uus parool on vigane. Kontrolli nouded ule ja proovi uuesti.",
  "Auth.InvalidCurrentPassword": "Praegune parool on vale.",
  "Auth.PasswordUpdateFailed":
    "Parooli ei onnestunud uuendada. Proovi uuesti.",

  Registration: "Registreerimine ei ole selle paringu jaoks lubatud.",
  "Registration.EmailAlreadyExists": "See e-post on juba kasutusel.",
  "Registration.EmailExistsUnconfirmed":
    "See e-post on juba olemas, kuid pole veel kinnitatud. Kontrolli postkasti.",
  "Registration.Failed": "Registreerimisel laks midagi valesti. Proovi uuesti.",
  "Registration.InvalidData": "Palun kontrolli vormi ja proovi uuesti.",
  "Registration.HoneypotDetected": "Midagi laks valesti. Proovi uuesti.",
  "Registration.InvalidVerificationCode": "Vale kood. Proovi uuesti.",
  "Registration.VerificationLocked":
    "Liiga palju katseid. Proovi hiljem uuesti.",
  "Registration.VerificationExpired": "Kood on aegunud. Palun kusi uus kood.",
  "Verification.EmailNotConfirmed": "Sinu e-posti aadress ei ole kinnitatud.",
  "Verification.TokenNotFound":
    "Link on vigane voi juba kasutatud. Palun kusi uus kood.",
  "Verification.TokenExpired": "Link on aegunud. Palun kusi uus kood.",
  "Verification.AlreadyVerified": "E-post on juba kinnitatud.",
  "Verification.UpdateFailed": "Kinnitamine ebaonnestus. Proovi uuesti.",

  "PasswordReset.InvalidToken":
    "See parooli taastamise link on vigane voi aegunud. Palun kusi uus link.",
  "PasswordReset.InvalidOrExpired":
    "See parooli taastamise paring on vigane voi aegunud. Palun kusi uus link.",
  "PasswordReset.SamePassword": "Uus parool peab erinema vanast paroolist.",
  "PasswordReset.UpdateFailed":
    "Parooli ei onnestunud uuendada. Proovi uuesti.",
  "RefreshToken.InvalidToken":
    "Sinu sessioon on aegunud. Palun logi uuesti sisse.",
  "RefreshToken.TransactionFailed":
    "Tekkis serveriviga. Proovi mone aja parast uuesti.",
  "RefreshToken.UserNotFound":
    "Selle sessiooni kasutajat ei leitud. Palun logi uuesti sisse.",

  "Email.SendFailed":
    "E-kirja ei onnestunud praegu saata. Proovi hiljem uuesti.",
  "Email.TemplateNotFound":
    "E-kirja ei onnestunud saata. Proovi hiljem uuesti.",
  "Email.SendSuccess": "E-kiri on saadetud.",
  "Support.ValidationFailed":
    "Palun kontrolli tugisonumit ja proovi uuesti.",
  "Support.UserNotFound":
    "Me ei suutnud sinu kontot tuvastada. Palun logi uuesti sisse ja proovi uuesti.",
  "Support.QueueFailed":
    "Tugisonumit ei onnestunud jarjekorda lisada. Proovi hiljem uuesti.",

  "User.ValidationFailed": "Palun kontrolli vormi ja proovi uuesti.",
  "User.GenericError": "Midagi laks valesti. Proovi hiljem uuesti.",
  "User.NotFound": "Kasutajat ei leitud.",
  "User.FirstNameRequired": "Sisesta oma eesnimi.",
  "User.LastNameRequired": "Sisesta oma perekonnanimi.",
  "User.ProfileUpdateFailed":
    "Sinu profiili ei onnestunud uuendada. Proovi uuesti.",
  "User.NotFoundAfterUpdate":
    "Profiil uuendati, kuid seda ei saanud uuesti laadida. Proovi uuesti.",
  "User.EmailAlreadyExists": "See e-post on juba kasutusel.",
  "UserPreferences.NotFound": "Sinu eelistusi ei leitud.",
  "UserPreferences.InvalidCurrency": "Valitud valuuta on vigane.",
  "UserPreferences.UpdateFailed":
    "Sinu eelistusi ei onnestunud salvestada. Proovi uuesti.",

  "Budget.NotFound": "Selle konto jaoks ei leitud eelarvet.",
  "BudgetMonth.InvalidYearMonth":
    "Vigane kuu vorming. Kasuta vormingut YYYY-MM.",
  "BudgetMonth.InvalidCarryMode":
    "Vigane ulekande reziim. Kontrolli valikut ja proovi uuesti.",
  "BudgetMonth.InvalidCarryAmount":
    "Vigane ulekande summa. Kontrolli summat ja proovi uuesti.",
  "BudgetMonth.OpenMonthExists":
    "Juba on olemas avatud kuu, mis tuleb enne sulgeda.",
  "BudgetMonth.MonthIsClosed": "See kuu on juba suletud.",
  "BudgetMonth.InvalidTargetMonth":
    "Sihtkuu ei saa olla enne praegust avatud kuud.",
  "BudgetMonth.MonthNotFound": "Valitud eelarvekuud ei leitud.",
  "BudgetMonth.SnapshotMissing":
    "Suletud kuu toommis puudub. Proovi uuesti voi vota toega uhendust.",
  BUDGET_NOT_FOUND: "Selle konto jaoks ei leitud eelarvet.",

  "Wizard.SessionNotFound": "Viisardi sessiooni ei leitud.",
  "Wizard.NoData": "Viisardi andmeid ei leitud.",
  "Wizard.CreateFailed": "Viisardi kaivitamine ebaonnestus. Proovi uuesti.",
  "Wizard.ValidatorNotFound":
    "Seda sammu ei saa praegu salvestada. Proovi uuesti.",
  "Wizard.NullData": "Sammu andmed puuduvad. Proovi uuesti.",
  "Wizard.TargetMissing":
    "Seda sammu ei saanud toodelda. Proovi uuesti.",
  "Wizard.ProcessorNotFound":
    "Seda sammu ei saanud toodelda. Proovi uuesti.",
  "Debt.JsonError":
    "Volaandmete vorming on vigane. Kontrolli ja proovi uuesti.",
  "Debt.InvalidData": "Palun kontrolli volaandmeid ja proovi uuesti.",
  "Income.JsonError":
    "Sissetuleku andmete vorming on vigane. Kontrolli ja proovi uuesti.",
  "Income.InvalidData":
    "Palun kontrolli sissetuleku andmeid ja proovi uuesti.",
  "Savings.JsonError":
    "Saastuandmete vorming on vigane. Kontrolli ja proovi uuesti.",
  "Savings.InvalidData":
    "Palun kontrolli saastuandmeid ja proovi uuesti.",
  "Expenditure.JsonError":
    "Kulude andmete vorming on vigane. Kontrolli ja proovi uuesti.",
  "Expenditure.InvalidData":
    "Palun kontrolli kulude andmeid ja proovi uuesti.",

  "Validation.Failed": "Palun kontrolli vormi ja proovi uuesti.",
  "Validation.Error": "Palun kontrolli vormi ja proovi uuesti.",
  "Serialization.Failed":
    "Andmeid ei saanud toodelda. Proovi mone aja parast uuesti.",
  "Token.Invalid": "Sinu sessioon on vigane. Palun logi uuesti sisse.",
  "Database.Error":
    "Sinu andmeid ei saanud praegu salvestada. Proovi hiljem uuesti.",
  "Database.SaveFailed": "Muudatuste salvestamine ebaonnestus. Proovi uuesti.",
  "Request.Canceled": "Paring katkestati. Proovi uuesti.",
  "Server.Error": "Tekkis ootamatu serveriviga. Proovi uuesti.",
  "RateLimit.Exceeded": "Liiga palju katseid. Proovi hiljem uuesti.",
  "RateLimit.TooManyRequests": "Liiga palju katseid. Proovi hiljem uuesti.",

  Unknown: "Midagi laks valesti. Proovi uuesti.",
} satisfies Record<ApiErrorCode, string>;

const KNOWN_API_ERROR_CODES = new Set<string>(API_ERROR_CODES);

export function asApiErrorCode(raw: unknown): ApiErrorCode {
  const code = String(raw ?? "").trim();
  return KNOWN_API_ERROR_CODES.has(code) ? (code as ApiErrorCode) : "Unknown";
}

export function labelApiError(code: ApiErrorCode, locale: AppLocale) {
  const table = locale.startsWith("sv")
    ? sv
    : locale.startsWith("et")
      ? et
      : en;

  return table[code];
}
