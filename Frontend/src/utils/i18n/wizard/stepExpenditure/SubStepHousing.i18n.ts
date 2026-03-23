export const subStepHousingDict = {
  sv: {
    pillMajor: "Utgifter",
    pillSub: "Boende",

    subtitle: "Välj boendetyp och fyll i boendekostnader. Lån kommer senare.",

    guardrailLoansEmphasis: "Bolån & andra lån",
    guardrailLoansTo: "Skulder",
    guardrailHereEmphasis: "Här fyller du i",
    guardrailHereTo: "boendekostnader + drift",

    helpTitle: "Tips",
    helpItem1:
      "Hyresrätt: hyra. Bostadsrätt: månadsavgift + ev. extra avgifter.",
    helpItem2:
      "Driftkostnader: el, värme, vatten/avlopp, sopor (det som gäller dig).",

    totalTitle: "Totalt boende",
    totalSubtitle: "Summa för boendekostnad + drift per månad",
    totalSuffix: "/mån",
  },

  en: {
    pillMajor: "Expenses",
    pillSub: "Housing",

    subtitle:
      "Choose your housing type and fill in housing costs. Loans come later.",

    guardrailLoansEmphasis: "Mortgage & other loans",
    guardrailLoansTo: "Debts",
    guardrailHereEmphasis: "Here you enter",
    guardrailHereTo: "housing costs + running costs",

    helpTitle: "Tips",
    helpItem1: "Renting: rent. Co-op apartment: monthly fee + any extra fees.",
    helpItem2:
      "Running costs: electricity, heating, water/sewage, waste (what applies to you).",

    totalTitle: "Total housing",
    totalSubtitle: "Housing cost + running costs per month",
    totalSuffix: "/mo",
  },

  et: {
    pillMajor: "Kulud",
    pillSub: "Eluaseme kulud",

    subtitle:
      "Vali eluaseme tüüp ja sisesta eluasemekulud. Laenud tulevad hiljem.",

    guardrailLoansEmphasis: "Kodulaen ja muud laenud",
    guardrailLoansTo: "Võlad",
    guardrailHereEmphasis: "Siin sisestad",
    guardrailHereTo: "eluasemekulud + kõrvalkulud",

    helpTitle: "Nipid",
    helpItem1:
      "Üürikorter: üür. Korteriühistu: kuutasu + võimalikud lisatasud.",
    helpItem2:
      "Kõrvalkulud: elekter, küte, vesi/kanalisatsioon, prügi (mis sinu puhul kehtib).",

    totalTitle: "Eluaseme kogukulu",
    totalSubtitle: "Eluasemekulu + kõrvalkulud kuus",
    totalSuffix: "/kuu",
  },
} as const;
