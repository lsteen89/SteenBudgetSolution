/**
 * i18n dictionary for the open-month MoneyState anchor.
 *
 * Owned strings:
 * - Section eyebrow + remaining label.
 * - Surplus / zero / deficit explanatory copy. Honest, never shameful.
 * - Six-term equation labels (income, carry-over, expenses, savings, debts,
 *   remaining) and operator/equals symbols so RTL/locale-specific punctuation
 *   stays in the dictionary rather than being hard-coded in the component.
 * - AllocationBar labels (aria + segment labels passed through).
 * - Secondary link copy pointing to the existing /dashboard/breakdown route.
 *
 * Carry-over is its own equation term and is rendered even when zero so the
 * user can see why the number is what it is.
 */
export const moneyStateDict = {
  en: {
    eyebrow: "Money state",
    remainingLabel: "Left this month",
    helperPositive: "after planned income, carry-over, expenses, savings and debts.",
    helperZero: "All of this month's money is planned.",
    helperNegative:
      "The plan is over what is coming in. Adjust expenses, savings or debts before closing.",

    toneWordPositive: "free to allocate",
    toneWordZero: "fully assigned",
    toneWordNegative: "short",

    equationAriaLabel: "How the remaining amount is calculated",
    equationIncome: "Income",
    equationCarryOver: "Carry-over",
    equationExpenses: "Expenses",
    equationSavings: "Savings",
    equationDebts: "Debts",
    equationRemaining: "Left",
    equationPlus: "+",
    equationMinus: "−",
    equationEquals: "=",

    allocationCaption: "How this month's money is allocated",
    allocationAria: "Planned allocation across expenses, savings, debts and free room",
    allocationExpenses: "Expenses",
    allocationSavings: "Savings",
    allocationDebts: "Debts",
    allocationFree: "Free",
    allocationUnfunded: "Unfunded by the plan",
    allocationRunsOut: "Where money runs out",

    breakdownLink: "See the full breakdown",
    breakdownHint:
      "Categories, recurring costs, subscriptions, goals and debts.",
  },

  sv: {
    eyebrow: "Pengaläge",
    remainingLabel: "Kvar den här månaden",
    helperPositive:
      "efter planerade inkomster, ingående överskott, utgifter, sparande och skulder.",
    helperZero: "Alla pengar är planerade den här månaden.",
    helperNegative:
      "Planen är över det som kommer in. Justera utgifter, sparande eller skulder innan stängning.",

    toneWordPositive: "fritt att fördela",
    toneWordZero: "allt är fördelat",
    toneWordNegative: "underskott",

    equationAriaLabel: "Så räknas det kvarvarande beloppet ut",
    equationIncome: "Inkomster",
    equationCarryOver: "Överskott in",
    equationExpenses: "Utgifter",
    equationSavings: "Sparande",
    equationDebts: "Skulder",
    equationRemaining: "Kvar",
    equationPlus: "+",
    equationMinus: "−",
    equationEquals: "=",

    allocationCaption: "Så är månadens pengar planerade",
    allocationAria:
      "Planerad fördelning på utgifter, sparande, skulder och fritt utrymme",
    allocationExpenses: "Utgifter",
    allocationSavings: "Sparande",
    allocationDebts: "Skulder",
    allocationFree: "Fritt",
    allocationUnfunded: "Saknar täckning i planen",
    allocationRunsOut: "Här tar pengarna slut",

    breakdownLink: "Se hela fördelningen",
    breakdownHint:
      "Kategorier, återkommande kostnader, prenumerationer, mål och skulder.",
  },

  et: {
    eyebrow: "Rahaseis",
    remainingLabel: "Selle kuu jääk",
    helperPositive:
      "pärast planeeritud tulu, ülekantud jääki, kulusid, sääste ja võlgu.",
    helperZero: "Kogu selle kuu raha on planeeritud.",
    helperNegative:
      "Plaan ületab sissetulekut. Kohanda kulusid, sääste või võlgu enne sulgemist.",

    toneWordPositive: "vaba jaotada",
    toneWordZero: "kõik on jaotatud",
    toneWordNegative: "puudujääk",

    equationAriaLabel: "Kuidas allesjääv summa arvutatakse",
    equationIncome: "Tulu",
    equationCarryOver: "Ülekantud jääk",
    equationExpenses: "Kulud",
    equationSavings: "Säästud",
    equationDebts: "Võlad",
    equationRemaining: "Jääk",
    equationPlus: "+",
    equationMinus: "−",
    equationEquals: "=",

    allocationCaption: "Kuidas selle kuu raha on jagatud",
    allocationAria:
      "Planeeritud jaotus kulude, säästude, võlgade ja vaba ruumi vahel",
    allocationExpenses: "Kulud",
    allocationSavings: "Säästud",
    allocationDebts: "Võlad",
    allocationFree: "Vaba",
    allocationUnfunded: "Plaan ei kata seda osa",
    allocationRunsOut: "Siin raha lõpeb",

    breakdownLink: "Vaata kogu jaotust",
    breakdownHint:
      "Kategooriad, püsikulud, tellimused, eesmärgid ja võlad.",
  },
} as const;
