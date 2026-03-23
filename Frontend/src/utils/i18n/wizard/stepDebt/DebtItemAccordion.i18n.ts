export const debtItemAccordionDict = {
  sv: {
    fallbackDebtName: "Skuld {index}",

    typeBankLoan: "Banklån",
    typeRevolving: "Kreditkort",
    typeInstallment: "Avbetalning",
    typePrivate: "Privatlån",
    typeUnknown: "Skuld",

    missingInfo: "Uppgifter saknas",

    remainingLabel: "Rest",
    interestLabel: "Ränta",
    termLabel: "Löptid",

    monthsShort: "mån",
    perMonthSuffix: "/mån",

    removeDebtAria: "Ta bort skuld",
    footerHint: "Det här är en uppskattning – du kan justera senare.",
  },

  en: {
    fallbackDebtName: "Debt {index}",

    typeBankLoan: "Bank loan",
    typeRevolving: "Credit card",
    typeInstallment: "Installment plan",
    typePrivate: "Private loan",
    typeUnknown: "Debt",

    missingInfo: "Information missing",

    remainingLabel: "Remaining",
    interestLabel: "Interest",
    termLabel: "Term",

    monthsShort: "mo",
    perMonthSuffix: "/mo",

    removeDebtAria: "Remove debt",
    footerHint: "This is an estimate — you can adjust it later.",
  },

  et: {
    fallbackDebtName: "Võlg {index}",

    typeBankLoan: "Pangalaen",
    typeRevolving: "Krediitkaart",
    typeInstallment: "Järelmaks",
    typePrivate: "Eralaen",
    typeUnknown: "Võlg",

    missingInfo: "Andmed puuduvad",

    remainingLabel: "Jääk",
    interestLabel: "Intress",
    termLabel: "Periood",

    monthsShort: "kuud",
    perMonthSuffix: "/kuu",

    removeDebtAria: "Eemalda võlg",
    footerHint: "See on hinnang — saad seda hiljem muuta.",
  },
} as const;
