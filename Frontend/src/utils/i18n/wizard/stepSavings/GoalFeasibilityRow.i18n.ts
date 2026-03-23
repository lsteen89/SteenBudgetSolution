export const goalFeasibilityRowDict = {
  sv: {
    perMonthSuffix: "/mån",
    etaShortTemplate: "~{months} mån",

    remainingLabel: "Kvar",
    savedLabel: "Sparat",
    targetMissing: "Målbelopp saknas",

    chipDone: "Klart",
    chipMissing: "Saknas",
    chipGood: "Bra takt",
    chipOk: "Långsiktigt",
    chipSlow: "Tar tid",

    statusNoTargetWithContribution:
      "Du sparar mot målet, men målbelopp saknas.",
    statusNoTargetNoContribution:
      "Sätt en månadstakt för att göra målet konkret.",

    statusDone: "Målet är redan uppnått.",
    statusNoContributionTemplate: "Sätt en månadstakt för att nå {amount}.",

    statusOneMonth: "Takt ser bra ut — målet kan nås inom ~1 månad.",
    statusMonthsLeftTemplate: "Takt ser bra ut — ~{months} månader kvar.",
    statusLongTermTemplate: "Det här är långsiktigt — ~{months} månader kvar.",
    statusSlowTemplate:
      "Det här tar tid med nuvarande takt — ~{months} månader.",
  },

  en: {
    perMonthSuffix: "/mo",
    etaShortTemplate: "~{months} mo",

    remainingLabel: "Remaining",
    savedLabel: "Saved",
    targetMissing: "Target amount missing",

    chipDone: "Done",
    chipMissing: "Missing",
    chipGood: "Good pace",
    chipOk: "Long-term",
    chipSlow: "Takes time",

    statusNoTargetWithContribution:
      "You are saving toward the goal, but the target amount is missing.",
    statusNoTargetNoContribution:
      "Set a monthly pace to make the goal concrete.",

    statusDone: "The goal has already been reached.",
    statusNoContributionTemplate: "Set a monthly pace to reach {amount}.",

    statusOneMonth:
      "The pace looks good — the goal can be reached within ~1 month.",
    statusMonthsLeftTemplate: "The pace looks good — ~{months} months left.",
    statusLongTermTemplate: "This is long-term — ~{months} months left.",
    statusSlowTemplate:
      "This will take time at the current pace — ~{months} months.",
  },

  et: {
    perMonthSuffix: "/kuu",
    etaShortTemplate: "~{months} kuud",

    remainingLabel: "Jäänud",
    savedLabel: "Säästetud",
    targetMissing: "Eesmärgi summa puudub",

    chipDone: "Valmis",
    chipMissing: "Puudub",
    chipGood: "Hea tempo",
    chipOk: "Pikaajaline",
    chipSlow: "Võtab aega",

    statusNoTargetWithContribution:
      "Sa säästad eesmärgi nimel, kuid eesmärgi summa puudub.",
    statusNoTargetNoContribution:
      "Sea igakuine tempo, et eesmärk muutuks konkreetseks.",

    statusDone: "Eesmärk on juba saavutatud.",
    statusNoContributionTemplate:
      "Sea igakuine tempo, et jõuda summani {amount}.",

    statusOneMonth: "Tempo tundub hea — eesmärgini võib jõuda umbes 1 kuuga.",
    statusMonthsLeftTemplate: "Tempo tundub hea — umbes {months} kuud jäänud.",
    statusLongTermTemplate: "See on pikaajaline — umbes {months} kuud jäänud.",
    statusSlowTemplate:
      "Praeguse tempoga võtab see aega — umbes {months} kuud.",
  },
} as const;
