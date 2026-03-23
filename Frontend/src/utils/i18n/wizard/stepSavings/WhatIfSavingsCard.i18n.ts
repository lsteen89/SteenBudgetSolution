export const whatIfSavingsCardDict = {
  sv: {
    title: "Vad händer om du sparar lite extra?",
    subtitle: "Justera belopp, tid och avkastning och se ett scenario direkt.",

    summaryPerMonthPrefix: "+",
    summaryPerMonthSuffix: "/mån",
    summaryYearsPrefix: "i",
    summaryYearsSuffix: "år",
    summaryRatePrefix: "med",
    summaryRateSuffix: "avkastning",

    controlMonthly: "Per månad",
    controlYears: "År",
    controlRate: "Förväntad avkastning",

    scenarioTitle: "Scenario",
    scenarioTextTemplate:
      "Du sätter in {deposit} och får +{gain} i avkastning.",
    totalValueAfterYearsTemplate: "Totalt värde efter {years} år",

    disclaimer:
      "Antagande: månadssparande i slutet av varje månad. Avkastning är ett scenario, inte en garanti.",
    disclaimerFollowup: "Du kan alltid justera ditt sparande senare.",
  },

  en: {
    title: "What happens if you save a little extra?",
    subtitle:
      "Adjust the amount, time, and return to see a scenario instantly.",

    summaryPerMonthPrefix: "+",
    summaryPerMonthSuffix: "/mo",
    summaryYearsPrefix: "for",
    summaryYearsSuffix: "years",
    summaryRatePrefix: "with",
    summaryRateSuffix: "return",

    controlMonthly: "Per month",
    controlYears: "Years",
    controlRate: "Expected return",

    scenarioTitle: "Scenario",
    scenarioTextTemplate:
      "You contribute {deposit} and get +{gain} in returns.",
    totalValueAfterYearsTemplate: "Total value after {years} years",

    disclaimer:
      "Assumption: monthly savings at the end of each month. Return is a scenario, not a guarantee.",
    disclaimerFollowup: "You can always adjust your savings later.",
  },

  et: {
    title: "Mis juhtub, kui säästad veidi rohkem?",
    subtitle: "Muuda summat, aega ja tootlust ning vaata stsenaariumi kohe.",

    summaryPerMonthPrefix: "+",
    summaryPerMonthSuffix: "/kuu",
    summaryYearsPrefix: "",
    summaryYearsSuffix: "aastat",
    summaryRatePrefix: "",
    summaryRateSuffix: "tootlusega",

    controlMonthly: "Kuus",
    controlYears: "Aastad",
    controlRate: "Oodatav tootlus",

    scenarioTitle: "Stsenaarium",
    scenarioTextTemplate: "Sa panustad {deposit} ja saad +{gain} tootlust.",
    totalValueAfterYearsTemplate: "Koguväärtus pärast {years} aastat",

    disclaimer:
      "Eeldus: igakuine sääst kuu lõpus. Tootlus on stsenaarium, mitte garantii.",
    disclaimerFollowup: "Saad oma sääste hiljem alati muuta.",
  },
} as const;
