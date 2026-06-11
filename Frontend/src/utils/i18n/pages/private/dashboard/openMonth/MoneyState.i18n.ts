/**
 * i18n dictionary for the open-month MoneyState anchor.
 *
 * Owned strings:
 * - The "Open month" kicker (rendered as `Open month · {date range}`; the
 *   date range itself is locale-formatted by the component).
 * - Surplus / zero / deficit tone words + explanatory copy. Honest, never
 *   shameful.
 * - AllocationBar labels (aria + segment labels passed through) and the
 *   allocation section caption.
 * - The small ghost "Breakdown" action in the allocation header, pointing to
 *   the existing /dashboard/breakdown route.
 *
 * The six-term equation is no longer rendered (V2 PR2) — reconciliation
 * remains a console diagnostic in the component, so no equation strings live
 * here anymore.
 */
export const moneyStateDict = {
  en: {
    kickerOpenMonth: "Open month",
    helperPositive: "after planned income, carry-over, expenses, savings and debts.",
    helperZero: "All of this month's money is planned.",
    helperNegative:
      "The plan is over what is coming in. Adjust expenses, savings or debts before closing.",

    toneWordPositive: "free to allocate",
    toneWordZero: "fully assigned",
    toneWordNegative: "short",

    allocationCaption: "Where the month goes",
    allocationAria: "Planned allocation across expenses, savings, debts and free room",
    allocationExpenses: "Expenses",
    allocationSavings: "Savings",
    allocationDebts: "Debts",
    allocationFree: "Free",
    allocationRunsOut: "Where money runs out",

    breakdownLink: "Breakdown",
  },

  sv: {
    kickerOpenMonth: "Öppen månad",
    helperPositive:
      "efter planerade inkomster, ingående överskott, utgifter, sparande och skulder.",
    helperZero: "Alla pengar är planerade den här månaden.",
    helperNegative:
      "Planen är över det som kommer in. Justera utgifter, sparande eller skulder innan stängning.",

    toneWordPositive: "fritt att fördela",
    toneWordZero: "allt är fördelat",
    toneWordNegative: "underskott",

    allocationCaption: "Vart månadens pengar går",
    allocationAria:
      "Planerad fördelning på utgifter, sparande, skulder och fritt utrymme",
    allocationExpenses: "Utgifter",
    allocationSavings: "Sparande",
    allocationDebts: "Skulder",
    allocationFree: "Fritt",
    allocationRunsOut: "Här tar pengarna slut",

    breakdownLink: "Fördelning",
  },

  et: {
    kickerOpenMonth: "Avatud kuu",
    helperPositive:
      "pärast planeeritud tulu, ülekantud jääki, kulusid, sääste ja võlgu.",
    helperZero: "Kogu selle kuu raha on planeeritud.",
    helperNegative:
      "Plaan ületab sissetulekut. Kohanda kulusid, sääste või võlgu enne sulgemist.",

    toneWordPositive: "vaba jaotada",
    toneWordZero: "kõik on jaotatud",
    toneWordNegative: "puudujääk",

    allocationCaption: "Kuhu selle kuu raha läheb",
    allocationAria:
      "Planeeritud jaotus kulude, säästude, võlgade ja vaba ruumi vahel",
    allocationExpenses: "Kulud",
    allocationSavings: "Säästud",
    allocationDebts: "Võlad",
    allocationFree: "Vaba",
    allocationRunsOut: "Siin raha lõpeb",

    breakdownLink: "Jaotus",
  },
} as const;
