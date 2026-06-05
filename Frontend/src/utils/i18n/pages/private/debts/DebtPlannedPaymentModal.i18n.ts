export const debtPlannedPaymentModalDict = {
  sv: {
    eyebrow: "Skuld",
    titleEdit: "Justera planerad betalning",
    description:
      "Justera hur mycket som planeras betalas mot den här skulden. Saldo påverkas inte här.",
    closeAriaLabel: "Stäng skuldmodal",
    amountLabel: "Planerad månadsbetalning",
    saveChanges: "Spara",
    saving: "Sparar...",
    cancel: "Avbryt",
    scopePlanDisabledHint: "Den här skulden finns bara i den här månaden.",
    amountInvalid: "Ange ett giltigt belopp",

    // Debt Polish PR 2: dirty-form preview card. Recomputes interest, fee,
    // principal, and projected balance against the row's current balance /
    // APR / fee using the FE mirror of the PR 1 backend formula
    // (`utils/debtPaymentBreakdown.ts`). Only the planned payment is
    // editable here — balance is intentionally untouched.
    previewLabel: "Förhandsvisning",
    previewSubtitle: "Så fördelas månadens betalning",
    previewPlannedPaymentLabel: "Planerad månadsbetalning",
    previewInterestLabel: "Ränta",
    previewFeeLabel: "Avgift",
    previewPrincipalLabel: "Minskar skulden",
    previewProjectedAfterLabel: "Beräknat saldo efter månaden",
    previewBalanceUnchangedNote: "Saldo påverkas inte här.",
    previewShortfallAdvisory:
      "Betalningen täcker inte ränta och avgift. Saldot väntas inte minska denna månad.",
    previewShortfallAmount: "Saknas: {amount}",
  },
  en: {
    eyebrow: "Debt",
    titleEdit: "Adjust planned payment",
    description:
      "Adjust how much is planned to pay toward this debt. Balances are not changed here.",
    closeAriaLabel: "Close debt modal",
    amountLabel: "Planned monthly payment",
    saveChanges: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    scopePlanDisabledHint: "This debt only exists in the current month.",
    amountInvalid: "Enter a valid amount",

    previewLabel: "Preview",
    previewSubtitle: "How this month's payment splits",
    previewPlannedPaymentLabel: "Planned monthly payment",
    previewInterestLabel: "Interest",
    previewFeeLabel: "Fee",
    previewPrincipalLabel: "Reduces balance",
    previewProjectedAfterLabel: "Projected balance after this month",
    previewBalanceUnchangedNote: "Balance is not changed here.",
    previewShortfallAdvisory:
      "Payment does not cover interest and fee. Balance is not expected to decrease this month.",
    previewShortfallAmount: "Missing: {amount}",
  },
  et: {
    eyebrow: "Võlg",
    titleEdit: "Kohanda planeeritud makset",
    description:
      "Kohanda, kui palju selle võla heaks plaanitakse maksta. Jääk siin ei muutu.",
    closeAriaLabel: "Sulge võla modal",
    amountLabel: "Planeeritud kuumakse",
    saveChanges: "Salvesta",
    saving: "Salvestamine...",
    cancel: "Tühista",
    scopePlanDisabledHint: "See võlg on olemas ainult selles kuus.",
    amountInvalid: "Sisesta kehtiv summa",

    previewLabel: "Eelvaade",
    previewSubtitle: "Kuidas kuumakse jaguneb",
    previewPlannedPaymentLabel: "Planeeritud kuumakse",
    previewInterestLabel: "Intress",
    previewFeeLabel: "Tasu",
    previewPrincipalLabel: "Vähendab võlga",
    previewProjectedAfterLabel: "Hinnanguline jääk pärast seda kuud",
    previewBalanceUnchangedNote: "Jääki see vaade ei muuda.",
    previewShortfallAdvisory:
      "Makse ei kata intressi ja tasu. Jääk sel kuul tõenäoliselt ei vähene.",
    previewShortfallAmount: "Puudu: {amount}",
  },
} as const;
