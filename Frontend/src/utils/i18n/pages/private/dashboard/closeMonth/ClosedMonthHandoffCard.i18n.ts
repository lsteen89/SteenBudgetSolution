// Calm handoff card surfaced once, immediately after a successful month close.
// The copy must:
//   - reward the habit of reviewing & closing the month
//   - never celebrate or shame the financial result
//   - point the user at one calm next step (continue to next month)
//
// Tokens:
//   {month}      → label of the just-closed month (e.g. "april 2026")
//   {nextMonth}  → label of the upcoming month (e.g. "maj 2026")
//   {amount}     → already-formatted money string with currency

export const closedMonthHandoffCardDict = {
  sv: {
    title: "{month} är stängd",

    bodyPositiveFull:
      "Bra jobbat — {month} är sparad som en historisk sammanfattning. {amount} har förts över till {nextMonth}.",
    bodyPositiveKept:
      "Bra jobbat — {month} är sparad som en historisk sammanfattning. {amount} sparades som överskott i {month}.",
    bodyBalanced:
      "Snyggt — månaden är avslutad och sparad som en historisk sammanfattning. Du kan nu granska {month} eller fortsätta planera {nextMonth}.",
    bodyDeficit:
      "{month} slutade på {amount}. Månaden är sparad, och du kan ta med dig insikterna till nästa plan.",

    continue: "Fortsätt till {nextMonth}",
    dismiss: "Stäng",
    dismissAria: "Stäng meddelandet",
  },

  en: {
    title: "{month} is closed",

    bodyPositiveFull:
      "Good work — {month} is saved as a historical summary. {amount} has been carried over to {nextMonth}.",
    bodyPositiveKept:
      "Good work — {month} is saved as a historical summary. {amount} was kept as a surplus in {month}.",
    bodyBalanced:
      "Nicely done — the month is closed and saved as a historical summary. You can review {month} or continue planning {nextMonth}.",
    bodyDeficit:
      "{month} ended at {amount}. The month is saved, and you can take the insights with you into the next plan.",

    continue: "Continue to {nextMonth}",
    dismiss: "Dismiss",
    dismissAria: "Dismiss this message",
  },

  et: {
    title: "{month} on suletud",

    bodyPositiveFull:
      "Tubli töö — {month} on salvestatud ajaloolise kokkuvõttena. {amount} on üle kantud kuusse {nextMonth}.",
    bodyPositiveKept:
      "Tubli töö — {month} on salvestatud ajaloolise kokkuvõttena. {amount} jäi ülejäägina kuusse {month}.",
    bodyBalanced:
      "Tehtud — kuu on suletud ja salvestatud ajaloolise kokkuvõttena. Saad vaadata kuud {month} või jätkata kuu {nextMonth} planeerimist.",
    bodyDeficit:
      "{month} lõppes summaga {amount}. Kuu on salvestatud ja saad kogemused järgmise plaani jaoks kaasa võtta.",

    continue: "Jätka kuusse {nextMonth}",
    dismiss: "Sulge",
    dismissAria: "Sulge see teade",
  },
} as const;
