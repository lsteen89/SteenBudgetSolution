export const wizardIncomeDict = {
  sv: {
    majorLabel: "Inkomster",
    subLabel: "Inkomster",
    subtitle: "Ange din huvudinkomst. Lägg till andra inkomster om du vill.",

    guard1Em: "Skatter & bruttolön",
    guard1To: "är inte nödvändigt här",
    guard2Em: "Här fyller du i",
    guard2To: "netto och frekvens",

    helpTitle: "Vad räknas som inkomst?",
    helpItem1: "Lön (netto)",
    helpItem2: "A-kassa, sjukpenning, pension",
    helpItem3: "Bidrag och stöd",
    helpItem4: "Sidoinkomster / frilans",

    loading: "Laddar…",

    mainIncomeTitle: "Huvudinkomst",
    amountLabel: "Belopp",
    amountPlaceholder: "t.ex. 30 000",
    salaryFrequencyLabel: "Lönefrekvens",
    paymentTimingLabel: "När får du vanligtvis lön?",
    paymentTimingHelper:
      "Vi använder detta för att föreslå när din budgetmånad bör sluta. Du kan ändra det senare.",
    paymentTimingOptionDayOfMonth: "Specifik dag",
    paymentTimingOptionLastDay: "Sista dagen i månaden",
    paymentTimingDayLabel: "Dag i månaden",
    paymentTimingDayPlaceholder: "Välj dag",
    approxSuffix: "/ mån",

    totalTitle: "Total månadsinkomst",
    totalSubtitle: "Summa av lön + hushåll + sidoinkomster",
    totalSuffix: "/mån",

    freqMonthly: "Per månad",
    freqWeekly: "Per vecka",
    freqBiWeekly: "Varannan vecka",
    freqQuarterly: "Per kvartal",
    freqYearly: "Årligen",
  },

  en: {
    majorLabel: "Income",
    subLabel: "Income",
    subtitle: "Enter your main income. Add other incomes if you want.",

    guard1Em: "Taxes & gross salary",
    guard1To: "are not needed here",
    guard2Em: "Here you enter",
    guard2To: "net income and frequency",

    helpTitle: "What counts as income?",
    helpItem1: "Salary (net)",
    helpItem2: "Unemployment, sick pay, pension",
    helpItem3: "Benefits and support",
    helpItem4: "Side income / freelance",

    loading: "Loading…",

    mainIncomeTitle: "Main income",
    amountLabel: "Amount",
    amountPlaceholder: "e.g. 3,000",
    salaryFrequencyLabel: "Pay frequency",
    paymentTimingLabel: "When do you usually get paid?",
    paymentTimingHelper:
      "We use this to suggest when your budget month should end. You can change it later.",
    paymentTimingOptionDayOfMonth: "Specific day",
    paymentTimingOptionLastDay: "Last day of the month",
    paymentTimingDayLabel: "Day of month",
    paymentTimingDayPlaceholder: "Select day",
    approxSuffix: "/ mo",

    totalTitle: "Total monthly income",
    totalSubtitle: "Sum of salary + household + side income",
    totalSuffix: "/mo",

    freqMonthly: "Per month",
    freqWeekly: "Per week",
    freqBiWeekly: "Every two weeks",
    freqQuarterly: "Per quarter",
    freqYearly: "Yearly",
  },

  et: {
    majorLabel: "Sissetulekud",
    subLabel: "Sissetulekud",
    subtitle:
      "Sisesta oma põhisissetulek. Soovi korral lisa teised sissetulekud.",

    guard1Em: "Maksud ja brutopalk",
    guard1To: "pole siin vajalikud",
    guard2Em: "Siin sisestad",
    guard2To: "netosumma ja sageduse",

    helpTitle: "Mis loetakse sissetulekuks?",
    helpItem1: "Palk (neto)",
    helpItem2: "Töötushüvitis, haigushüvitis, pension",
    helpItem3: "Toetused ja hüvitised",
    helpItem4: "Lisatulu / vabakutseline töö",

    loading: "Laen…",

    mainIncomeTitle: "Põhisissetulek",
    amountLabel: "Summa",
    amountPlaceholder: "nt 2 000",
    salaryFrequencyLabel: "Palga sagedus",
    paymentTimingLabel: "Millal sa tavaliselt palka saad?",
    paymentTimingHelper:
      "Kasutame seda, et soovitada, millal sinu eelarvekuu võiks lõppeda. Saad seda hiljem muuta.",
    paymentTimingOptionDayOfMonth: "Kindel kuupäev",
    paymentTimingOptionLastDay: "Kuu viimane päev",
    paymentTimingDayLabel: "Kuupäev kuus",
    paymentTimingDayPlaceholder: "Vali päev",
    approxSuffix: "/ kuu",

    totalTitle: "Kogu kuusissetulek",
    totalSubtitle: "Palk + leibkond + lisatulud kokku",
    totalSuffix: "/kuu",

    freqMonthly: "Kuus",
    freqWeekly: "Nädalas",
    freqBiWeekly: "Üle nädala",
    freqQuarterly: "Kvartalis",
    freqYearly: "Aastas",
  },
} as const;
