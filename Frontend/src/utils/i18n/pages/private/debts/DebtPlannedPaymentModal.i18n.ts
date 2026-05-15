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
  },
} as const;
