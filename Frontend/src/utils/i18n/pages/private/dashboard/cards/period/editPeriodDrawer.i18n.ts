export const editPeriodDrawerDict = {
  sv: {
    closePeriodEditor: "Stäng periodredigeraren",
    editPeriodAriaLabel: "Redigera period {periodLabel}",

    recurringExpensesTitle: "Rörliga kostnader",
    recurringExpensesDescription:
      "Justera månadens rörliga kostnader. Boende och fasta kostnader hanteras i planeringen.",

    subscriptionsTitle: "Abonnemang",
    subscriptionsDescription:
      "Slå av eller på abonnemang för den här månaden och justera belopp vid behov.",

    loadingEditor: "Laddar periodredigerare...",
    loadMonthError: "Kunde inte läsa in denna månad.",
    monthClosedReadOnly: "Den här månaden är stängd och kan inte redigeras.",

    footerSummaryReadOnly: "Stängd månad. Skrivskyddad.",
    footerSummaryEditable:
      "Granska ändringarna och spara dem för den här månaden.",
    footerSummaryNoChanges: "Inga ändringar att spara.",

    saveSuccess: "Ändringarna sparades.",

    categoryHousing: "Boende",
    categoryRent: "Hyra",
    categoryFood: "Mat",
    categoryTransport: "Transport",
    categoryClothing: "Kläder",
    categoryFixedExpense: "Fast kostnad",
    categorySubscription: "Abonnemang",
    categoryOther: "Övrigt",

    loadCategoriesError: "Kunde inte läsa in utgiftskategorier.",
    noEditableExpenses:
      "Det finns inga rörliga kostnader att snabbjustera denna månad.",
    noSubscriptions: "Det finns inga abonnemang att justera denna månad.",
    footerSummaryLiveResult: "Nytt resultat: {sign}{amount}",
  },

  en: {
    closePeriodEditor: "Close period editor",
    editPeriodAriaLabel: "Edit period {periodLabel}",

    recurringExpensesTitle: "Variable expenses",
    recurringExpensesDescription:
      "Adjust this month's variable expenses. Housing and fixed costs are managed in planning.",

    subscriptionsTitle: "Subscriptions",
    subscriptionsDescription:
      "Turn subscriptions on or off for this month and adjust the amount if needed.",

    loadingEditor: "Loading period editor...",
    loadMonthError: "Could not load this month.",
    monthClosedReadOnly: "This month is closed and cannot be edited.",

    footerSummaryReadOnly: "Closed month. Read-only.",
    footerSummaryEditable: "Review your changes and save them for this month.",
    footerSummaryNoChanges: "No changes to save.",

    saveSuccess: "Changes saved.",

    categoryHousing: "Housing",
    categoryRent: "Rent",
    categoryFood: "Food",
    categoryTransport: "Transport",
    categoryClothing: "Clothing",
    categoryFixedExpense: "Fixed cost",
    categorySubscription: "Subscription",
    categoryOther: "Other",

    loadCategoriesError: "Could not load expense categories.",
    noEditableExpenses:
      "There are no variable expenses to quick adjust this month.",
    noSubscriptions: "There are no subscriptions to adjust this month.",
    footerSummaryLiveResult: "New result: {sign}{amount}",
  },

  et: {
    closePeriodEditor: "Sulge perioodi muutja",
    editPeriodAriaLabel: "Muuda perioodi {periodLabel}",

    recurringExpensesTitle: "Muutuvad kulud",
    recurringExpensesDescription:
      "Kohanda selle kuu muutuvaid kulusid. Eluaseme- ja püsikulud hallatakse planeerimise vaates.",

    subscriptionsTitle: "Tellimused",
    subscriptionsDescription:
      "Lülita selle kuu tellimusi sisse või välja ja muuda vajadusel summat.",

    loadingEditor: "Perioodi muutja laadimine...",
    loadMonthError: "Seda kuud ei saanud laadida.",
    monthClosedReadOnly: "See kuu on suletud ja seda ei saa muuta.",

    footerSummaryReadOnly: "Suletud kuu. Ainult vaatamiseks.",
    footerSummaryEditable:
      "Vaata muudatused üle ja salvesta need selle kuu jaoks.",
    footerSummaryNoChanges: "Muudatusi pole salvestamiseks.",

    saveSuccess: "Muudatused salvestati.",

    categoryHousing: "Elamine",
    categoryRent: "Üür",
    categoryFood: "Toit",
    categoryTransport: "Transport",
    categoryClothing: "Riided",
    categoryFixedExpense: "Püsikulu",
    categorySubscription: "Tellimus",
    categoryOther: "Muu",

    loadCategoriesError: "Kulukategooriaid ei saanud laadida.",
    noEditableExpenses:
      "Sellel kuul ei ole muutuvaid kulusid, mida kiiresti kohandada.",
    noSubscriptions: "Sellel kuul ei ole tellimusi, mida kohandada.",
    footerSummaryLiveResult: "Uus tulemus: {sign}{amount}",
  },
} as const;
