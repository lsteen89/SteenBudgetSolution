export const savingsPlanSummaryCardDict = {
  sv: {
    title: "Din sparplan",
    subtitle: "Målen räknas inom ditt månadssparande (inte utöver).",

    labelYouSave: "Du sparar",
    labelGoalsRequire: "Målen kräver",
    labelStatus: "Status",

    suffixPerMonth: "/mån",

    badgeReasonable: "Rimligt",
    badgeGapTemplate: "Gap: {amount}/mån",
    badgeNoGoals: "Inga mål än",
    badgeMissingHabits: "Sparvanor saknas",

    statusRemainingTemplate: "Kvar: {amount} /mån",
    statusMissingTemplate: "Saknas: {amount} /mån",

    ctaAdjustHabits: "Justera sparvanor",
    ctaEnterHabits: "Ange sparvanor",
  },

  en: {
    title: "Your savings plan",
    subtitle:
      "The goals are counted within your monthly savings, not on top of them.",

    labelYouSave: "You save",
    labelGoalsRequire: "Goals require",
    labelStatus: "Status",

    suffixPerMonth: "/mo",

    badgeReasonable: "Reasonable",
    badgeGapTemplate: "Gap: {amount}/mo",
    badgeNoGoals: "No goals yet",
    badgeMissingHabits: "Savings habits missing",

    statusRemainingTemplate: "Remaining: {amount} /mo",
    statusMissingTemplate: "Missing: {amount} /mo",

    ctaAdjustHabits: "Adjust savings habits",
    ctaEnterHabits: "Enter savings habits",
  },

  et: {
    title: "Sinu säästuplaan",
    subtitle:
      "Eesmärgid arvestatakse sinu igakuise säästu sisse, mitte sellele lisaks.",

    labelYouSave: "Sa säästad",
    labelGoalsRequire: "Eesmärgid nõuavad",
    labelStatus: "Staatus",

    suffixPerMonth: "/kuu",

    badgeReasonable: "Mõistlik",
    badgeGapTemplate: "Puudujääk: {amount}/kuu",
    badgeNoGoals: "Eesmärke veel pole",
    badgeMissingHabits: "Säästmisharjumused puuduvad",

    statusRemainingTemplate: "Alles jääb: {amount} /kuu",
    statusMissingTemplate: "Puudu: {amount} /kuu",

    ctaAdjustHabits: "Kohanda säästmisharjumusi",
    ctaEnterHabits: "Sisesta säästmisharjumused",
  },
} as const;
