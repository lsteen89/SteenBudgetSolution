// Debt PR 7 — i18n dictionary for the edit-details drawer. Shares grammar
// with `DebtCreateModal.i18n.ts`; balance is shown read-only here because
// PR 3's `Uppdatera saldo` endpoint owns balance changes.

export const debtDetailsModalDict = {
  sv: {
    eyebrow: "Skuld",
    title: "Redigera uppgifter",
    description:
      "Justera namn, typ, ränta och övriga uppgifter för den här skulden. Saldo ändras inte här — använd ”Uppdatera saldo” för det.",
    closeAriaLabel: "Stäng redigera uppgifter",

    legendFacts: "Skuld",
    factsBalanceLabel: "Kvar att betala",
    factsBalanceHint: "Saldo ändras via ”Uppdatera saldo”, inte här.",

    legendDetails: "Uppgifter",
    nameLabel: "Namn",
    namePlaceholder: "t.ex. Billån",
    typeLabel: "Typ",
    typeRevolving: "Kreditkort",
    typeInstallment: "Avbetalning",
    typeBankLoan: "Banklån",
    typePrivate: "Privatlån",
    aprLabel: "Årsränta (%)",
    monthlyFeeLabel: "Avgift per månad",
    monthlyFeeOptional: "Valfritt · kr per månad",
    minPaymentLabel: "Minsta betalning",
    minPaymentHint: "Krävs för kreditkort.",
    termMonthsLabel: "Löptid (månader)",
    termMonthsSuffix: "mån",
    termMonthsHint: "Krävs för avbetalning och banklån.",
    paymentLabel: "Planerad månadsbetalning",
    paymentHint:
      "Så mycket planerar du att betala denna månad. Saldo påverkas inte här.",

    scopePlanDisabledHint: "Den här skulden finns bara i den här månaden.",

    // Debt Polish PR 2: scope-aware dirty-form preview. Math comes from the
    // FE mirror of the PR 1 backend formula in `utils/debtPaymentBreakdown.ts`.
    previewLabel: "Förhandsvisning",
    previewLabelPlanOnly: "Förhandsvisning · Budgetplan framåt",
    previewSubtitle: "Så fördelas månadens betalning",
    previewSubtitlePlanOnly: "Så fördelas en planerad månads betalning",
    previewCurrentMonthLabel: "Den här månaden",
    previewBudgetPlanLabel: "Budgetplan framåt",
    previewCurrentMonthUnchanged: "Lämnas oförändrad.",
    previewBudgetPlanReceivesEdit: "Får de redigerade värdena.",
    previewPlannedPaymentLabel: "Planerad månadsbetalning",
    previewInterestLabel: "Ränta",
    previewFeeLabel: "Avgift",
    previewPrincipalLabel: "Minskar skulden",
    previewProjectedAfterLabel: "Beräknat saldo efter månaden",
    previewProjectedAfterLabelPlanOnly:
      "Beräknat saldo efter en planerad månad",
    previewBalanceUnchangedNote: "Saldo påverkas inte här.",
    previewShortfallAdvisory:
      "Betalningen täcker inte ränta och avgift. Saldot väntas inte minska denna månad.",
    previewShortfallAmount: "Saknas: {amount}",

    cancel: "Avbryt",
    save: "Spara",
    saving: "Sparar...",

    nameRequired: "Ange ett namn för skulden.",
    nameTooLong: "Namnet är för långt.",
    typeRequired: "Välj en typ för skulden.",
    aprInvalid: "Ange en giltig räntesats (0 eller mer).",
    monthlyFeeInvalid: "Ange en giltig månadsavgift (0 eller mer).",
    minPaymentInvalid: "Ange en giltig minsta betalning (0 eller mer).",
    minPaymentRequiredRevolving:
      "Minsta betalning krävs för kreditkort (minst 1 kr).",
    termInvalid: "Ange en giltig löptid (minst 1 månad).",
    termRequiredInstallment:
      "Löptid krävs för avbetalning och banklån.",
    paymentInvalid: "Ange ett giltigt belopp (0 eller mer).",
    submitError: "Uppgifterna kunde inte sparas. Försök igen.",
  },
  en: {
    eyebrow: "Debt",
    title: "Edit details",
    description:
      "Adjust the name, type, rate, and other fields for this debt. Balance is not changed here — use \"Update balance\" for that.",
    closeAriaLabel: "Close edit details",

    legendFacts: "Debt",
    factsBalanceLabel: "Owed balance",
    factsBalanceHint:
      "Balance is updated via \"Update balance\", not here.",

    legendDetails: "Details",
    nameLabel: "Name",
    namePlaceholder: "e.g. Car loan",
    typeLabel: "Type",
    typeRevolving: "Credit card",
    typeInstallment: "Installment",
    typeBankLoan: "Bank loan",
    typePrivate: "Private loan",
    aprLabel: "Annual rate (%)",
    monthlyFeeLabel: "Fee per month",
    monthlyFeeOptional: "Optional · per month",
    minPaymentLabel: "Minimum payment",
    minPaymentHint: "Required for credit cards.",
    termMonthsLabel: "Term (months)",
    termMonthsSuffix: "mo",
    termMonthsHint: "Required for installment and bank loans.",
    paymentLabel: "Planned monthly payment",
    paymentHint:
      "How much you plan to pay this month. Balances are not changed here.",

    scopePlanDisabledHint: "This debt only exists in the current month.",

    previewLabel: "Preview",
    previewLabelPlanOnly: "Preview · Budget plan forward",
    previewSubtitle: "How this month's payment splits",
    previewSubtitlePlanOnly: "How a planned month's payment splits",
    previewCurrentMonthLabel: "Current month",
    previewBudgetPlanLabel: "Budget plan forward",
    previewCurrentMonthUnchanged: "Remains unchanged.",
    previewBudgetPlanReceivesEdit: "Receives the edited values.",
    previewPlannedPaymentLabel: "Planned monthly payment",
    previewInterestLabel: "Interest",
    previewFeeLabel: "Fee",
    previewPrincipalLabel: "Reduces balance",
    previewProjectedAfterLabel: "Projected balance after this month",
    previewProjectedAfterLabelPlanOnly:
      "Projected balance after a planned month",
    previewBalanceUnchangedNote: "Balance is not changed here.",
    previewShortfallAdvisory:
      "Payment does not cover interest and fee. Balance is not expected to decrease this month.",
    previewShortfallAmount: "Missing: {amount}",

    cancel: "Cancel",
    save: "Save",
    saving: "Saving...",

    nameRequired: "Enter a name for the debt.",
    nameTooLong: "Name is too long.",
    typeRequired: "Pick a debt type.",
    aprInvalid: "Enter a valid rate (0 or more).",
    monthlyFeeInvalid: "Enter a valid monthly fee (0 or more).",
    minPaymentInvalid: "Enter a valid minimum payment (0 or more).",
    minPaymentRequiredRevolving:
      "Minimum payment is required for credit cards (at least 1).",
    termInvalid: "Enter a valid term (at least 1 month).",
    termRequiredInstallment:
      "Term is required for installment and bank loans.",
    paymentInvalid: "Enter a valid amount (0 or more).",
    submitError: "Could not save the details. Please try again.",
  },
  et: {
    eyebrow: "Võlg",
    title: "Muuda andmeid",
    description:
      "Kohanda nimi, liik, intress ja muud väljad selle võla jaoks. Jääki siin ei muudeta — kasuta selleks valikut „Uuenda jääki“.",
    closeAriaLabel: "Sulge andmete muutmine",

    legendFacts: "Võlg",
    factsBalanceLabel: "Tasumata jääk",
    factsBalanceHint:
      "Jääki uuendatakse valiku „Uuenda jääki“ kaudu, mitte siin.",

    legendDetails: "Andmed",
    nameLabel: "Nimi",
    namePlaceholder: "nt autolaen",
    typeLabel: "Liik",
    typeRevolving: "Krediitkaart",
    typeInstallment: "Järelmaks",
    typeBankLoan: "Pangalaen",
    typePrivate: "Erainvestori laen",
    aprLabel: "Aastaintress (%)",
    monthlyFeeLabel: "Tasu kuus",
    monthlyFeeOptional: "Valikuline · kuus",
    minPaymentLabel: "Minimaalne makse",
    minPaymentHint: "Krediitkaartide puhul kohustuslik.",
    termMonthsLabel: "Tähtaeg (kuud)",
    termMonthsSuffix: "kuu",
    termMonthsHint: "Järelmaksu ja pangalaenu puhul kohustuslik.",
    paymentLabel: "Planeeritud kuumakse",
    paymentHint:
      "Kui palju kavatsed sel kuul maksta. Jääki see vaade ei muuda.",

    scopePlanDisabledHint: "See võlg on olemas ainult selles kuus.",

    previewLabel: "Eelvaade",
    previewLabelPlanOnly: "Eelvaade · Eelarveplaan edaspidi",
    previewSubtitle: "Kuidas kuumakse jaguneb",
    previewSubtitlePlanOnly: "Kuidas planeeritud kuu makse jaguneb",
    previewCurrentMonthLabel: "See kuu",
    previewBudgetPlanLabel: "Eelarveplaan edaspidi",
    previewCurrentMonthUnchanged: "Jääb muutmata.",
    previewBudgetPlanReceivesEdit: "Saab muudetud väärtused.",
    previewPlannedPaymentLabel: "Planeeritud kuumakse",
    previewInterestLabel: "Intress",
    previewFeeLabel: "Tasu",
    previewPrincipalLabel: "Vähendab võlga",
    previewProjectedAfterLabel: "Hinnanguline jääk pärast seda kuud",
    previewProjectedAfterLabelPlanOnly:
      "Hinnanguline jääk pärast planeeritud kuud",
    previewBalanceUnchangedNote: "Jääki see vaade ei muuda.",
    previewShortfallAdvisory:
      "Makse ei kata intressi ja tasu. Jääk sel kuul tõenäoliselt ei vähene.",
    previewShortfallAmount: "Puudu: {amount}",

    cancel: "Tühista",
    save: "Salvesta",
    saving: "Salvestamine...",

    nameRequired: "Sisesta võla nimi.",
    nameTooLong: "Nimi on liiga pikk.",
    typeRequired: "Vali võla liik.",
    aprInvalid: "Sisesta kehtiv intress (0 või enam).",
    monthlyFeeInvalid: "Sisesta kehtiv kuutasu (0 või enam).",
    minPaymentInvalid: "Sisesta kehtiv minimaalne makse (0 või enam).",
    minPaymentRequiredRevolving:
      "Minimaalne makse on krediitkaartide puhul kohustuslik (vähemalt 1).",
    termInvalid: "Sisesta kehtiv tähtaeg (vähemalt 1 kuu).",
    termRequiredInstallment:
      "Tähtaeg on järelmaksu ja pangalaenu puhul kohustuslik.",
    paymentInvalid: "Sisesta kehtiv summa (0 või enam).",
    submitError: "Andmeid ei saanud salvestada. Proovi uuesti.",
  },
} as const;
