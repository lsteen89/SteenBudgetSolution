/**
 * V2 PR-09 — i18n strings for the Engångsöverföring (one-time transfer)
 * modal. Mirrors the structure of `SavingsGoalMonthlyModal.i18n.ts` so
 * the three focused modals read consistently in code review.
 *
 * Tone: same calm Nordic register the V2 design carries — no exclamation,
 * money-first phrasing, deposits/withdrawals as the user's normal verb.
 */
export const savingsGoalTransferModalDict = {
  sv: {
    eyebrow: "Sparmål",
    title: "Engångsöverföring",
    description:
      "Flytta pengar in eller ut direkt — påverkar bara saldot, inte månadsbeloppet.",
    closeAriaLabel: "Stäng engångsöverföring",

    directionDeposit: "Sätt in",
    directionWithdraw: "Ta ut",

    amountLabel: "Belopp",
    amountUnit: "kr",
    sourceLabel: "Från konto",
    targetLabel: "Till konto",
    sourcePlaceholder: "Välj konto",
    noteLabel: "Notering (valfritt)",
    notePlaceholder: "T.ex. lön från extrajobb",
    noteHint: "Visas bara i händelsehistoriken.",

    quickFillLabel: "Snabbval",

    snapshotSavedLabel: "Sparat",
    snapshotTargetLabel: "Mål",
    snapshotDeadlineLabel: "Måldatum",
    snapshotDeadlineOngoing: "Löpande",

    outcomeLabel: "Efter överföring",
    outcomeEmpty: "Ange ett belopp för att se effekten.",
    outcomeDeposit:
      "Sparat blir {next} ({pct} % av målet) · {remaining} kvar till målet.",
    outcomeDepositOngoing: "Sparat blir {next}.",
    outcomeWithdraw:
      "Sparat blir {next} · {remaining} kvar till målet.",
    outcomeWithdrawOngoing: "Sparat blir {next}.",
    outcomeOverTarget:
      "Sparat blir {next} — det är {over} mer än målet. Du kan ändå spara det här.",

    withdrawTooMuchLabel: "Går inte att ta ut så mycket",
    withdrawTooMuch:
      "Det finns bara {available} sparat. Sänk beloppet eller välj en insättning.",

    amountRequired: "Ange ett belopp.",
    amountInvalid: "Ange ett giltigt belopp med högst 2 decimaler.",
    amountNotPositive: "Beloppet måste vara större än noll.",
    amountTooLarge: "Beloppet får inte vara större än 10 000 000 kr.",
    sourceRequired: "Välj ett konto.",

    saveDeposit: "Sätt in",
    saveDepositWithAmount: "Sätt in {amount}",
    saveWithdraw: "Ta ut",
    saveWithdrawWithAmount: "Ta ut {amount}",
    saving: "Sparar...",
    cancel: "Avbryt",
    footerNote: "Bokförs på dagens datum",

    toastDeposit: "Insättning sparad.",
    toastWithdraw: "Uttag sparat.",
    toastError: "Kunde inte spara överföringen. Försök igen.",
  },
  en: {
    eyebrow: "Savings goal",
    title: "One-time transfer",
    description:
      "Move money in or out directly — affects only the balance, not the monthly amount.",
    closeAriaLabel: "Close one-time transfer",

    directionDeposit: "Deposit",
    directionWithdraw: "Withdraw",

    amountLabel: "Amount",
    amountUnit: "kr",
    sourceLabel: "From account",
    targetLabel: "To account",
    sourcePlaceholder: "Choose account",
    noteLabel: "Note (optional)",
    notePlaceholder: "e.g. side-job paycheck",
    noteHint: "Only visible in the change history.",

    quickFillLabel: "Quick amounts",

    snapshotSavedLabel: "Saved",
    snapshotTargetLabel: "Target",
    snapshotDeadlineLabel: "Target date",
    snapshotDeadlineOngoing: "Ongoing",

    outcomeLabel: "After transfer",
    outcomeEmpty: "Enter an amount to preview the impact.",
    outcomeDeposit:
      "Saved becomes {next} ({pct} % of target) · {remaining} left to the target.",
    outcomeDepositOngoing: "Saved becomes {next}.",
    outcomeWithdraw:
      "Saved becomes {next} · {remaining} left to the target.",
    outcomeWithdrawOngoing: "Saved becomes {next}.",
    outcomeOverTarget:
      "Saved becomes {next} — that's {over} above the target. You can still save this.",

    withdrawTooMuchLabel: "Cannot withdraw that much",
    withdrawTooMuch:
      "Only {available} is saved. Lower the amount or switch to a deposit.",

    amountRequired: "Enter an amount.",
    amountInvalid: "Enter a valid amount with at most 2 decimals.",
    amountNotPositive: "The amount must be greater than zero.",
    amountTooLarge: "The amount cannot exceed 10,000,000.",
    sourceRequired: "Choose an account.",

    saveDeposit: "Deposit",
    saveDepositWithAmount: "Deposit {amount}",
    saveWithdraw: "Withdraw",
    saveWithdrawWithAmount: "Withdraw {amount}",
    saving: "Saving...",
    cancel: "Cancel",
    footerNote: "Recorded with today's date",

    toastDeposit: "Deposit saved.",
    toastWithdraw: "Withdrawal saved.",
    toastError: "Could not save the transfer. Try again.",
  },
  et: {
    eyebrow: "Säästueesmärk",
    title: "Ühekordne ülekanne",
    description:
      "Liiguta raha sisse või välja — mõjutab ainult saldot, mitte kuumakset.",
    closeAriaLabel: "Sulge ühekordne ülekanne",

    directionDeposit: "Sissemakse",
    directionWithdraw: "Väljavõtt",

    amountLabel: "Summa",
    amountUnit: "kr",
    sourceLabel: "Kontolt",
    targetLabel: "Kontole",
    sourcePlaceholder: "Vali konto",
    noteLabel: "Märkus (valikuline)",
    notePlaceholder: "Nt boonus",
    noteHint: "Näha ainult muudatuste ajaloos.",

    quickFillLabel: "Kiirvalik",

    snapshotSavedLabel: "Kogutud",
    snapshotTargetLabel: "Eesmärk",
    snapshotDeadlineLabel: "Sihtkuupäev",
    snapshotDeadlineOngoing: "Jooksev",

    outcomeLabel: "Pärast ülekannet",
    outcomeEmpty: "Sisesta summa mõju nägemiseks.",
    outcomeDeposit:
      "Kogutud saab {next} ({pct} % eesmärgist) · {remaining} eesmärgini.",
    outcomeDepositOngoing: "Kogutud saab {next}.",
    outcomeWithdraw:
      "Kogutud saab {next} · {remaining} eesmärgini.",
    outcomeWithdrawOngoing: "Kogutud saab {next}.",
    outcomeOverTarget:
      "Kogutud saab {next} — see on {over} üle eesmärgi. Saad selle siiski salvestada.",

    withdrawTooMuchLabel: "Nii palju ei saa välja võtta",
    withdrawTooMuch:
      "Kogutud on ainult {available}. Vähenda summat või vali sissemakse.",

    amountRequired: "Sisesta summa.",
    amountInvalid: "Sisesta korrektne summa kuni kahe komakohaga.",
    amountNotPositive: "Summa peab olema suurem kui null.",
    amountTooLarge: "Summa ei tohi ületada 10 000 000.",
    sourceRequired: "Vali konto.",

    saveDeposit: "Sissemakse",
    saveDepositWithAmount: "Tee sissemakse {amount}",
    saveWithdraw: "Väljavõtt",
    saveWithdrawWithAmount: "Võta välja {amount}",
    saving: "Salvestan...",
    cancel: "Tühista",
    footerNote: "Kirjendatakse tänase kuupäevaga",

    toastDeposit: "Sissemakse salvestatud.",
    toastWithdraw: "Väljavõtt salvestatud.",
    toastError: "Ülekande salvestamine ebaõnnestus. Proovi uuesti.",
  },
} as const;
