export const debtsPlanSummaryCardDict = {
  sv: {
    title: "Skuldöversikt",
    subtitle: "Visar total skuld och en uppskattad månadskostnad.",

    labelTotalDebt: "Total skuld",
    labelEstimatedPerMonth: "Uppskattat / mån",
    labelStatus: "Status",

    perMonthSuffix: "/mån",

    badgeDone: "Klart",
    badgeMissingTemplate: "{count} saknar uppgift",

    statusComplete: "Allt ifyllt",
    statusMissingSingle: "1 skuld saknar uppgift",
    statusMissingPluralTemplate: "{count} skulder saknar uppgift",

    ctaFillIn: "Fyll i uppgifter",
  },

  en: {
    title: "Debt overview",
    subtitle: "Shows total debt and an estimated monthly cost.",

    labelTotalDebt: "Total debt",
    labelEstimatedPerMonth: "Estimated / mo",
    labelStatus: "Status",

    perMonthSuffix: "/mo",

    badgeDone: "Done",
    badgeMissingTemplate: "{count} missing information",

    statusComplete: "Everything filled in",
    statusMissingSingle: "1 debt is missing information",
    statusMissingPluralTemplate: "{count} debts are missing information",

    ctaFillIn: "Fill in details",
  },

  et: {
    title: "Võlgade ülevaade",
    subtitle: "Näitab koguvõlga ja hinnangulist igakuist kulu.",

    labelTotalDebt: "Koguvõlg",
    labelEstimatedPerMonth: "Hinnanguline / kuu",
    labelStatus: "Staatus",

    perMonthSuffix: "/kuu",

    badgeDone: "Valmis",
    badgeMissingTemplate: "{count} puhul puudub info",

    statusComplete: "Kõik on täidetud",
    statusMissingSingle: "1 võlal puudub info",
    statusMissingPluralTemplate: "{count} võlal puudub info",

    ctaFillIn: "Täida andmed",
  },
} as const;
