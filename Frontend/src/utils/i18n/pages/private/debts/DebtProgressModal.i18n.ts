// Debt PR 9 — i18n dictionary for the `Återbetalningsförlopp` view. Every
// figure rendered comes from the PR 5 `DebtRowProgressDto` (typed
// `DebtBalanceEvent` history). When a debt has no recorded balance events the
// row carries `progress: null` and this modal is never opened; the
// no-history copy below is a defensive fallback only. Nothing is synthesised
// from current-vs-original balance on the client.

export const debtProgressModalDict = {
  sv: {
    eyebrow: "Skuld",
    title: "Återbetalningsförlopp",
    description: "Så har saldot minskat över tid.",
    closeAriaLabel: "Stäng återbetalningsförlopp",

    percentSuffix: "minskning av startsaldot",
    reducedLabel: "Minskat saldo",
    increasedLabel: "Ökat saldo",
    remainingLabel: "Kvar",
    ofOriginalLabel: "av {original}",

    noPercentNote:
      "Det startsaldo som registrerades var 0 kr, så ingen procent kan visas.",

    eventsOne: "Bygger på {count} sparad saldoändring",
    eventsOther: "Bygger på {count} sparade saldoändringar",
    dateRange: "{first} – {last}",

    noHistoryHeading: "Ingen sparad historik än",
    noHistoryBody:
      "När du uppdaterar saldot visas förloppet här. Inget räknas fram i förväg.",

    close: "Stäng",
  },
  en: {
    eyebrow: "Debt",
    title: "Repayment progress",
    description: "How the balance has gone down over time.",
    closeAriaLabel: "Close repayment progress",

    percentSuffix: "reduction of the starting balance",
    reducedLabel: "Balance reduced",
    increasedLabel: "Balance increased",
    remainingLabel: "Remaining",
    ofOriginalLabel: "of {original}",

    noPercentNote:
      "The recorded starting balance was 0, so no percentage can be shown.",

    eventsOne: "Based on {count} recorded balance change",
    eventsOther: "Based on {count} recorded balance changes",
    dateRange: "{first} – {last}",

    noHistoryHeading: "No saved history yet",
    noHistoryBody:
      "When you update the balance, progress shows up here. Nothing is computed ahead of time.",

    close: "Close",
  },
  et: {
    eyebrow: "Võlg",
    title: "Tasumise käik",
    description: "Kuidas jääk on aja jooksul vähenenud.",
    closeAriaLabel: "Sulge tasumise käik",

    percentSuffix: "algjäägi vähenemine",
    reducedLabel: "Jääk vähenenud",
    increasedLabel: "Jääk suurenenud",
    remainingLabel: "Jääk",
    ofOriginalLabel: "{original}-st",

    noPercentNote:
      "Registreeritud algjääk oli 0, seega protsenti ei saa kuvada.",

    eventsOne: "Põhineb {count} salvestatud jäägi muudatusel",
    eventsOther: "Põhineb {count} salvestatud jäägi muudatusel",
    dateRange: "{first} – {last}",

    noHistoryHeading: "Salvestatud ajalugu veel ei ole",
    noHistoryBody:
      "Kui uuendad jääki, ilmub käik siia. Midagi ei arvutata ette.",

    close: "Sulge",
  },
} as const;
