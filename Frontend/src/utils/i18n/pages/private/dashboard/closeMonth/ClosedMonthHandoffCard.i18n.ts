// Closed-month handoff takeover — copy surfaced once, immediately after a
// successful month close. The takeover is a full-screen interstitial (PR 02
// of the close-month redesign queue); the keys below cover its kicker,
// headline, stamp, year strip card, three-panel number strip, primary CTA,
// secondary stay link, and the read-only footer note.
//
// Brand voice (unchanged from PR 01):
//   - reward the habit of reviewing & closing the month
//   - never celebrate or shame the financial result
//   - point the user at one calm next step (continue to next month)
//
// Tokens:
//   {month}      → label of the just-closed month (e.g. "april 2026")
//   {monthOnly}  → just the month name without year (e.g. "april")
//   {nextMonth}  → label of the upcoming month (e.g. "maj 2026")
//   {amount}     → already-formatted money string with currency
//   {year}       → the four-digit year of the closing month (e.g. "2026")
//   {closed}     → count of months closed for the year, "{closed} / 12"

export const closedMonthHandoffCardDict = {
  sv: {
    // Preserved from the baseline strip so existing callers keep working.
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

    // Takeover — new for PR 02.
    kicker: "Månaden är stängd",
    headline: "{month} är sparad",
    subheadPositive:
      "En historisk sammanfattning är skapad. {nextMonth} ligger redan öppen — och har fått {amount} med sig på vägen.",
    subheadBalanced:
      "En historisk sammanfattning är skapad. {nextMonth} ligger redan öppen.",
    subheadDeficit:
      "En historisk sammanfattning är skapad. {nextMonth} ligger redan öppen — du kan börja om där.",
    stampLabel: "Stängd",
    stampSavedSuffix: " · sparad",
    yearLabel: "Året {year}",
    yearProgress: "{closed} / 12 månader stängda",
    panelIncome: "Inkomster i {monthOnly}",
    panelExpenses: "Utgifter i {monthOnly}",
    panelCarriedOver: "Fördes över till {nextMonth}",
    panelKept: "Stannade i {monthOnly}",
    panelNoSurplus: "Inget överskott den här månaden",
    continueTakeover: "Fortsätt till {nextMonth}",
    stayLink: "Stanna i {monthOnly} en stund",
    readOnlyNote:
      "Historiken är skrivskyddad — du kan alltid komma tillbaka och läsa {month}.",
    closeButtonAria: "Stäng översikten",
    summaryAriaPositive:
      "{month} är stängd, {amount} fördes över till {nextMonth}.",
    summaryAriaKept:
      "{month} är stängd, {amount} stannade i {monthOnly}.",
    summaryAriaBalanced: "{month} är stängd. Inget överskott den här månaden.",
    summaryAriaDeficit: "{month} är stängd och slutade på {amount}.",
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

    kicker: "Month is closed",
    headline: "{month} is saved",
    subheadPositive:
      "A historical summary is saved. {nextMonth} is already open — and gets {amount} along for the ride.",
    subheadBalanced:
      "A historical summary is saved. {nextMonth} is already open.",
    subheadDeficit:
      "A historical summary is saved. {nextMonth} is already open — you can start fresh there.",
    stampLabel: "Closed",
    stampSavedSuffix: " · saved",
    yearLabel: "Year {year}",
    yearProgress: "{closed} / 12 months closed",
    panelIncome: "Income in {monthOnly}",
    panelExpenses: "Expenses in {monthOnly}",
    panelCarriedOver: "Carried over to {nextMonth}",
    panelKept: "Kept in {monthOnly}",
    panelNoSurplus: "No surplus this month",
    continueTakeover: "Continue to {nextMonth}",
    stayLink: "Stay in {monthOnly} for a moment",
    readOnlyNote:
      "History is read-only — you can always come back and read {month}.",
    closeButtonAria: "Close the overview",
    summaryAriaPositive:
      "{month} is closed, {amount} carried over to {nextMonth}.",
    summaryAriaKept: "{month} is closed, {amount} kept in {monthOnly}.",
    summaryAriaBalanced: "{month} is closed. No surplus this month.",
    summaryAriaDeficit: "{month} is closed, ended at {amount}.",
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

    kicker: "Kuu on suletud",
    headline: "{month} on salvestatud",
    subheadPositive:
      "Ajalooline kokkuvõte on salvestatud. {nextMonth} on juba avatud — ja sai {amount} kaasa.",
    subheadBalanced: "Ajalooline kokkuvõte on salvestatud. {nextMonth} on juba avatud.",
    subheadDeficit:
      "Ajalooline kokkuvõte on salvestatud. {nextMonth} on juba avatud — sa võid sealt uuesti alustada.",
    stampLabel: "Suletud",
    stampSavedSuffix: " · salvestatud",
    yearLabel: "Aasta {year}",
    yearProgress: "{closed} / 12 kuud suletud",
    panelIncome: "Tulud kuus {monthOnly}",
    panelExpenses: "Kulud kuus {monthOnly}",
    panelCarriedOver: "Kanti üle kuusse {nextMonth}",
    panelKept: "Jäi kuusse {monthOnly}",
    panelNoSurplus: "Sel kuul ülejääki ei tekkinud",
    continueTakeover: "Jätka kuusse {nextMonth}",
    stayLink: "Jää veel kuusse {monthOnly}",
    readOnlyNote:
      "Ajalugu on kirjutuskaitstud — saad alati tagasi tulla ja {month} lugeda.",
    closeButtonAria: "Sulge ülevaade",
    summaryAriaPositive:
      "{month} on suletud, {amount} kanti üle kuusse {nextMonth}.",
    summaryAriaKept: "{month} on suletud, {amount} jäi kuusse {monthOnly}.",
    summaryAriaBalanced: "{month} on suletud. Sel kuul ülejääki ei tekkinud.",
    summaryAriaDeficit: "{month} on suletud, lõppes summaga {amount}.",
  },
} as const;
