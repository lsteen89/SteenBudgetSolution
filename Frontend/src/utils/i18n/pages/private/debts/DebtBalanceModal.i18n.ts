// Debt PR 9 — i18n dictionary for the `Uppdatera saldo` drawer. Shares the
// modal grammar with `DebtDetailsModal.i18n.ts`. The copy is framed as a calm
// correction (rättelse) and is explicit that the planned monthly payment is
// not touched here — balance and payment are kept strictly separate, in both
// directions.

export const debtBalanceModalDict = {
  sv: {
    eyebrow: "Skuld",
    title: "Uppdatera saldo",
    description:
      "Ange det aktuella saldot från din långivare. Det här är en rättelse av hur mycket du är skyldig — ingen värdering och ingen registrerad betalning.",
    closeAriaLabel: "Stäng uppdatera saldo",

    legendContext: "Skuld",
    contextBalanceLabel: "Nuvarande saldo",
    contextPaymentLabel: "Planerad månadsbetalning",
    contextPaymentHint: "Planerad månadsbetalning påverkas inte.",

    newBalanceLabel: "Nytt saldo · kvar att betala",
    newBalanceHint:
      "Ange det aktuella saldot. Det här rör inte din planerade betalning.",

    noteLabel: "Notering",
    noteOptional: "Valfritt",
    notePlaceholder: "t.ex. ny faktura från långivaren",

    calloutTitle: "Planerad betalning påverkas inte.",
    calloutBody:
      "Det här ändrar bara saldot — alltså hur mycket du är skyldig. Din planerade månadsbetalning på {payment} ligger kvar oförändrad.",

    scopePlanDisabledHint: "Den här skulden finns bara i den här månaden.",

    cancel: "Avbryt",
    save: "Spara",
    saving: "Sparar...",

    balanceRequired: "Ange ett saldo.",
    balanceInvalid: "Ange ett giltigt saldo (0 eller mer).",
    noteTooLong: "Noteringen är för lång (max 500 tecken).",
    submitError: "Saldot kunde inte sparas. Försök igen.",
  },
  en: {
    eyebrow: "Debt",
    title: "Update balance",
    description:
      "Enter the current balance from your lender. This is a correction of how much you owe — not a judgment and not a recorded payment.",
    closeAriaLabel: "Close update balance",

    legendContext: "Debt",
    contextBalanceLabel: "Current balance",
    contextPaymentLabel: "Planned monthly payment",
    contextPaymentHint: "The planned monthly payment is not affected.",

    newBalanceLabel: "New balance · owed",
    newBalanceHint:
      "Enter the current balance. This does not touch your planned payment.",

    noteLabel: "Note",
    noteOptional: "Optional",
    notePlaceholder: "e.g. new statement from the lender",

    calloutTitle: "Planned payment is not affected.",
    calloutBody:
      "This only changes the balance — how much you owe. Your planned monthly payment of {payment} stays unchanged.",

    scopePlanDisabledHint: "This debt only exists in the current month.",

    cancel: "Cancel",
    save: "Save",
    saving: "Saving...",

    balanceRequired: "Enter a balance.",
    balanceInvalid: "Enter a valid balance (0 or more).",
    noteTooLong: "The note is too long (max 500 characters).",
    submitError: "Could not save the balance. Please try again.",
  },
  et: {
    eyebrow: "Võlg",
    title: "Uuenda jääki",
    description:
      "Sisesta laenuandja praegune jääk. See on parandus selle kohta, kui palju võlgned — mitte hinnang ega registreeritud makse.",
    closeAriaLabel: "Sulge jäägi uuendamine",

    legendContext: "Võlg",
    contextBalanceLabel: "Praegune jääk",
    contextPaymentLabel: "Planeeritud kuumakse",
    contextPaymentHint: "Planeeritud kuumakset see ei mõjuta.",

    newBalanceLabel: "Uus jääk · tasumata",
    newBalanceHint:
      "Sisesta praegune jääk. See ei puuduta sinu planeeritud makset.",

    noteLabel: "Märkus",
    noteOptional: "Valikuline",
    notePlaceholder: "nt laenuandja uus arve",

    calloutTitle: "Planeeritud makset see ei mõjuta.",
    calloutBody:
      "See muudab ainult jääki — kui palju sa võlgned. Sinu planeeritud kuumakse {payment} jääb muutmata.",

    scopePlanDisabledHint: "See võlg on olemas ainult selles kuus.",

    cancel: "Tühista",
    save: "Salvesta",
    saving: "Salvestamine...",

    balanceRequired: "Sisesta jääk.",
    balanceInvalid: "Sisesta kehtiv jääk (0 või enam).",
    noteTooLong: "Märkus on liiga pikk (max 500 tähemärki).",
    submitError: "Jääki ei saanud salvestada. Proovi uuesti.",
  },
} as const;
