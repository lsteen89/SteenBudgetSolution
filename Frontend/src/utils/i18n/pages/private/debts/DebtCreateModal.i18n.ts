// Debt PR 7 — i18n dictionary for the add-debt drawer. Mirrors the
// `DebtDetailsModal.i18n.ts` shape so the two flows share grammar; keep
// `sv` / `en` / `et` in lockstep (the build type-checks `en` and `et`
// against `sv`).

export const debtCreateModalDict = {
  sv: {
    eyebrow: "Ny skuld",
    title: "Lägg till skuld",
    description:
      "Registrera en ny skuld så att den syns i månadens planering. Saldot är dagens skuld; planerad månadsbetalning säger hur mycket du planerar att betala mot den.",
    closeAriaLabel: "Stäng lägg-till-skuld",

    legendDetails: "Uppgifter",
    nameLabel: "Namn",
    namePlaceholder: "t.ex. Billån",
    typeLabel: "Typ",
    typeRevolving: "Kreditkort",
    typeInstallment: "Avbetalning",
    typeBankLoan: "Banklån",
    typePrivate: "Privatlån",
    balanceLabel: "Saldo · kvar att betala",
    balanceHint: "Det aktuella saldot från långivaren — sätter startvärdet.",
    aprLabel: "Ränta",
    monthlyFeeLabel: "Månadsavgift",
    monthlyFeeOptional: "Valfritt",
    minPaymentLabel: "Minsta betalning",
    minPaymentHint: "Krävs för kreditkort.",
    termMonthsLabel: "Löptid",
    termMonthsSuffix: "mån",
    termMonthsHint: "Krävs för avbetalning och banklån.",
    paymentLabel: "Planerad månadsbetalning",
    paymentHint:
      "Så mycket planerar du att betala mot den här skulden varje månad. Saldo påverkas inte här.",

    monthOnlyCallout:
      "Med ”Bara denna månad” skapas skulden bara i månadens planering. Den ärvs inte till kommande månader.",

    cancel: "Avbryt",
    save: "Lägg till skuld",
    saving: "Sparar...",

    // Validation
    nameRequired: "Ange ett namn för skulden.",
    nameTooLong: "Namnet är för långt.",
    typeRequired: "Välj en typ för skulden.",
    balanceInvalid: "Ange ett giltigt saldo (0 eller mer).",
    aprInvalid: "Ange en giltig räntesats (0 eller mer).",
    monthlyFeeInvalid: "Ange en giltig månadsavgift (0 eller mer).",
    minPaymentInvalid: "Ange en giltig minsta betalning (0 eller mer).",
    minPaymentRequiredRevolving:
      "Minsta betalning krävs för kreditkort (minst 1 kr).",
    termInvalid: "Ange en giltig löptid (minst 1 månad).",
    termRequiredInstallment:
      "Löptid krävs för avbetalning och banklån.",
    paymentInvalid: "Ange ett giltigt belopp (0 eller mer).",
    submitError: "Skulden kunde inte sparas. Försök igen.",
  },
  en: {
    eyebrow: "New debt",
    title: "Add debt",
    description:
      "Register a new debt so it appears in this month's planning. Balance is what you currently owe; the planned monthly payment is what you plan to pay toward it.",
    closeAriaLabel: "Close add debt",

    legendDetails: "Details",
    nameLabel: "Name",
    namePlaceholder: "e.g. Car loan",
    typeLabel: "Type",
    typeRevolving: "Credit card",
    typeInstallment: "Installment",
    typeBankLoan: "Bank loan",
    typePrivate: "Private loan",
    balanceLabel: "Balance · owed",
    balanceHint: "Current balance from the lender — sets the starting value.",
    aprLabel: "Rate",
    monthlyFeeLabel: "Monthly fee",
    monthlyFeeOptional: "Optional",
    minPaymentLabel: "Minimum payment",
    minPaymentHint: "Required for credit cards.",
    termMonthsLabel: "Term",
    termMonthsSuffix: "mo",
    termMonthsHint: "Required for installment and bank loans.",
    paymentLabel: "Planned monthly payment",
    paymentHint:
      "How much you plan to pay toward this debt each month. Balances are not changed here.",

    monthOnlyCallout:
      "With \"Only this month\" the debt is created in this month's plan only. It is not carried into future months.",

    cancel: "Cancel",
    save: "Add debt",
    saving: "Saving...",

    nameRequired: "Enter a name for the debt.",
    nameTooLong: "Name is too long.",
    typeRequired: "Pick a debt type.",
    balanceInvalid: "Enter a valid balance (0 or more).",
    aprInvalid: "Enter a valid rate (0 or more).",
    monthlyFeeInvalid: "Enter a valid monthly fee (0 or more).",
    minPaymentInvalid: "Enter a valid minimum payment (0 or more).",
    minPaymentRequiredRevolving:
      "Minimum payment is required for credit cards (at least 1).",
    termInvalid: "Enter a valid term (at least 1 month).",
    termRequiredInstallment:
      "Term is required for installment and bank loans.",
    paymentInvalid: "Enter a valid amount (0 or more).",
    submitError: "Could not save the debt. Please try again.",
  },
  et: {
    eyebrow: "Uus võlg",
    title: "Lisa võlg",
    description:
      "Registreeri uus võlg, et see ilmuks sel kuul planeerimisse. Jääk on praegune võlg; planeeritud kuumakse näitab, kui palju kavatsed selle vastu maksta.",
    closeAriaLabel: "Sulge võla lisamine",

    legendDetails: "Andmed",
    nameLabel: "Nimi",
    namePlaceholder: "nt autolaen",
    typeLabel: "Liik",
    typeRevolving: "Krediitkaart",
    typeInstallment: "Järelmaks",
    typeBankLoan: "Pangalaen",
    typePrivate: "Erainvestori laen",
    balanceLabel: "Jääk · tasumata",
    balanceHint: "Praegune jääk laenuandjalt — määrab algväärtuse.",
    aprLabel: "Intress",
    monthlyFeeLabel: "Kuutasu",
    monthlyFeeOptional: "Valikuline",
    minPaymentLabel: "Minimaalne makse",
    minPaymentHint: "Krediitkaartide puhul kohustuslik.",
    termMonthsLabel: "Tähtaeg",
    termMonthsSuffix: "kuu",
    termMonthsHint: "Järelmaksu ja pangalaenu puhul kohustuslik.",
    paymentLabel: "Planeeritud kuumakse",
    paymentHint:
      "Kui palju plaanid sel kuul selle võla vastu maksta. Jääki see vaade ei muuda.",

    monthOnlyCallout:
      "Valikuga „Ainult see kuu“ luuakse võlg ainult selle kuu plaani. Seda ei kanta järgmistesse kuudesse.",

    cancel: "Tühista",
    save: "Lisa võlg",
    saving: "Salvestamine...",

    nameRequired: "Sisesta võla nimi.",
    nameTooLong: "Nimi on liiga pikk.",
    typeRequired: "Vali võla liik.",
    balanceInvalid: "Sisesta kehtiv jääk (0 või enam).",
    aprInvalid: "Sisesta kehtiv intress (0 või enam).",
    monthlyFeeInvalid: "Sisesta kehtiv kuutasu (0 või enam).",
    minPaymentInvalid: "Sisesta kehtiv minimaalne makse (0 või enam).",
    minPaymentRequiredRevolving:
      "Minimaalne makse on krediitkaartide puhul kohustuslik (vähemalt 1).",
    termInvalid: "Sisesta kehtiv tähtaeg (vähemalt 1 kuu).",
    termRequiredInstallment:
      "Tähtaeg on järelmaksu ja pangalaenu puhul kohustuslik.",
    paymentInvalid: "Sisesta kehtiv summa (0 või enam).",
    submitError: "Võlga ei saanud salvestada. Proovi uuesti.",
  },
} as const;
