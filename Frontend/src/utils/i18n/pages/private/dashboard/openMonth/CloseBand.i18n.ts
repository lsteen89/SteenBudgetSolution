/**
 * i18n dictionary for the open-month CloseBand (PR5).
 *
 * Copy rules:
 *  - The band is rendered only for open months (the dashboard branches above
 *    it for closed/skipped). Treatments here describe lifecycle pressure, not
 *    spend, transactions, due dates, or burn-rate language — this is a
 *    budgeting product (handover § "Hard Constraints" item 1).
 *  - Deficit copy on the carry-forward preview stays factual, never shameful
 *    (handover § item 8).
 *  - Carry-forward preview is described as `max(remaining, 0)` so the user
 *    understands the next month inherits no debt from a deficit close.
 *  - No backend-authored "next best action" implied — the band reflects the
 *    same backend lifecycle/canCloseMonth values the MonthRail already shows.
 *  - All action labels describe where the button goes (the existing close
 *    review modal).
 */
export const closeBandDict = {
  en: {
    eyebrowOverdue: "Past due",
    eyebrowEligible: "Ready to close",
    eyebrowUpcoming: "Closing window",

    titleOverdue: "This month is past its close window",
    titleEligible: "Close this month when you're ready",
    titleUpcoming: "Closing opens soon",

    bodyOverdue:
      "Close it so the next month starts with a fresh carry-over and your snapshots stay aligned.",
    bodyEligible:
      "The plan is ready. Closing locks the snapshot and carries the remaining amount into the next month.",
    bodyUpcoming:
      "You'll be able to close this month soon. Nothing to do yet — keep planning.",

    carryForwardLabel: "Carry-forward preview",
    carryForwardSuffixPositive: "moves into next month after closing.",
    carryForwardSuffixZero:
      "the full amount is planned — nothing carries over after closing.",
    carryForwardSuffixDeficit:
      "the plan is over what's coming in, so nothing carries over after closing.",

    statusLabelOverdue: "Action required",
    statusLabelEligible: "Ready",
    statusLabelUpcoming: "Quiet",

    actionReviewAndClose: "Review & close",
    actionDisabledReason:
      "Closing isn't available yet. Adjust the plan if anything looks off.",

    ariaLabel: "Close-month status for this period",
  },

  sv: {
    eyebrowOverdue: "Försenad",
    eyebrowEligible: "Redo att stängas",
    eyebrowUpcoming: "Stängningsfönster",

    titleOverdue: "Den här månaden har passerat sitt stängningsfönster",
    titleEligible: "Stäng månaden när du är redo",
    titleUpcoming: "Stängningen öppnar snart",

    bodyOverdue:
      "Stäng den så att nästa månad börjar med ett färskt överfört saldo och ögonblicksbilderna håller sig i takt.",
    bodyEligible:
      "Planen är klar. Stängningen låser ögonblicksbilden och för över det som är kvar till nästa månad.",
    bodyUpcoming:
      "Du kan stänga månaden snart. Inget att göra just nu — fortsätt planera.",

    carryForwardLabel: "Förhandsvisning av överföring",
    carryForwardSuffixPositive: "förs över till nästa månad efter stängning.",
    carryForwardSuffixZero:
      "hela beloppet är planerat — inget förs över efter stängning.",
    carryForwardSuffixDeficit:
      "planen överstiger det som kommer in, så inget förs över efter stängning.",

    statusLabelOverdue: "Åtgärd krävs",
    statusLabelEligible: "Redo",
    statusLabelUpcoming: "Lugnt",

    actionReviewAndClose: "Granska & stäng",
    actionDisabledReason:
      "Stängning är inte tillgänglig ännu. Justera planen om något ser fel ut.",

    ariaLabel: "Stängningsstatus för perioden",
  },

  et: {
    eyebrowOverdue: "Tähtaeg ületatud",
    eyebrowEligible: "Sulgemiseks valmis",
    eyebrowUpcoming: "Sulgemise aken",

    titleOverdue: "See kuu on sulgemisaknast üle",
    titleEligible: "Sulge kuu, kui oled valmis",
    titleUpcoming: "Sulgemine avaneb varsti",

    bodyOverdue:
      "Sulge see, et järgmine kuu algaks värske ülekantud saldoga ja sinu ülevaated püsiksid kooskõlas.",
    bodyEligible:
      "Plaan on valmis. Sulgemine lukustab ülevaate ja kannab allesjäänud summa järgmisesse kuusse.",
    bodyUpcoming:
      "Saad selle kuu varsti sulgeda. Praegu pole midagi teha — jätka planeerimist.",

    carryForwardLabel: "Ülekande eelvaade",
    carryForwardSuffixPositive: "kantakse pärast sulgemist järgmisesse kuusse.",
    carryForwardSuffixZero:
      "kogu summa on planeeritud — pärast sulgemist ei kanta midagi üle.",
    carryForwardSuffixDeficit:
      "plaan ületab sissetulekut, seega pärast sulgemist ei kanta midagi üle.",

    statusLabelOverdue: "Nõuab tegevust",
    statusLabelEligible: "Valmis",
    statusLabelUpcoming: "Rahulik",

    actionReviewAndClose: "Vaata üle & sulge",
    actionDisabledReason:
      "Sulgemine pole veel saadaval. Kohanda plaani, kui midagi tundub vale.",

    ariaLabel: "Selle perioodi sulgemise olek",
  },
} as const;
