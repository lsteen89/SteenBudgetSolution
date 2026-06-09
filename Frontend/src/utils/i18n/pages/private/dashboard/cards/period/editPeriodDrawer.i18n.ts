export const editPeriodDrawerDict = {
  sv: {
    closePeriodEditor: "Stäng periodredigeraren",
    editPeriodAriaLabel: "Redigera period {periodLabel}",
    incomeTitle: "Inkomster",
    incomeDescription: "Justera inkomster för den öppna månaden.",
    noIncomeItems: "Det finns inga inkomster att snabbjustera.",
    incomeMonthOnlyHelper:
      "Snabbjusteringar påverkar bara {month}. Vill du ändra budgetplanen framåt? Öppna planeringen.",

    // PR D (income depth)
    incomeGroupSalary: "Lön",
    incomeGroupHousehold: "Hushållsinkomst",
    incomeGroupSide: "Sidoinkomst",
    incomeSalaryLockedLabel: "Låst",
    incomeNoSalaryYet:
      "Ingen lön är planerad ännu. Lägg till lön i planeringen.",
    incomeNoHouseholdMembers:
      "Inga hushållsinkomster för den här månaden. Lägg till en nedan.",
    incomeNoSideIncome:
      "Inga sidoinkomster för den här månaden. Lägg till en nedan.",
    incomeAddToGroup: "Lägg till i {category}",
    incomeInlineCreateHeading: "Ny inkomst i {category}",
    incomeInlineCreateNamePlaceholder: "Namn",
    incomeInlineCreateAmountPlaceholder: "Belopp",
    incomeInlineCreateSubmit: "Lägg till",
    incomeInlineCreateCancel: "Avbryt",
    incomeInlineCreateSaving: "Lägger till...",
    incomeNameRequired: "Namn krävs",
    incomeNameTooLong: "Namnet är för långt",
    incomeActiveToggleLabel: "Räkna med {name} den här månaden",
    incomeRowInactiveHint: "Räknas inte den här månaden",

    savingsTitle: "Sparande",
    savingsDescription: "Justera månadsbelopp för dina sparmål.",
    noSavingsGoals: "Det finns inga sparmål att snabbjustera.",
    savingsMonthOnlyHelper:
      "Snabbjusteringar påverkar bara {month}. Vill du ändra budgetplanen framåt? Öppna planeringen.",
    savingsBaseTitle: "Bassparande",
    savingsBaseDescription:
      "Det här är ditt fasta månadssparande innan sparmålen räknas med.",
    savingsBaseAmountLabel: "Bassparande",
    savingsBaseMonthOnlyHint: "Den här månaden har ett eget basbelopp.",
    savingsBaseApply: "Spara basbelopp",
    savingsGoalsSectionTitle: "Sparmål",

    debtsTitle: "Skulder",
    debtsDescription: "Justera planerad månadsbetalning för dina skulder.",
    noDebts: "Det finns inga skulder att snabbjustera.",
    debtsMonthOnlyHelper:
      "Snabbjusteringar påverkar bara {month}. Vill du ändra budgetplanen framåt? Öppna planeringen.",
    debtsPlannedNote:
      "Här ändras bara planerad betalning. Saldo uppdateras inte här.",
    // PR F (debt honesty): rich read model context + warnings
    debtsPlannedPaymentLabel: "Planerad betalning",
    debtsBalanceLabel: "Kvar att betala",
    debtsMinPaymentLabel: "Minsta betalning",
    debtsContextReadOnlyHint:
      "Saldo och minsta betalning visas bara här. Saldo uppdateras under Skulder.",
    debtsBelowMinWarning:
      "Under minsta betalning ({amount}).",
    debtsCoversInterestAndFeesWarning:
      "Betalningen täcker inte ränta och avgift. Saldot väntas inte minska denna månad.",
    debtsRowReadOnly:
      "Den här raden kan inte redigeras just nu.",
    debtsOpenFullEditor: "Öppna skuldsidan",

    recurringExpensesTitle: "Rörliga kostnader",
    recurringExpensesDescription:
      "Justera månadens rörliga kostnader. Boende och fasta kostnader hanteras i planeringen.",

    subscriptionsTitle: "Abonnemang",
    subscriptionsDescription:
      "Slå av eller på abonnemang för den här månaden och justera belopp vid behov.",

    loadingEditor: "Laddar periodredigerare...",
    loadMonthError: "Kunde inte läsa in denna månad.",
    monthClosedReadOnly: "Den här månaden är stängd och kan inte redigeras.",
    monthOnlyHelper:
      "Ändringar här gäller bara {month}. Vill du uppdatera budgetplanen framåt? Öppna planeringen.",

    footerSummaryReadOnly: "Stängd månad. Skrivskyddad.",
    footerSummaryEditable:
      "Granska ändringarna och spara dem för den här månaden.",
    footerSummaryNoChanges: "Inga ändringar att spara.",

    saveSuccess: "Alla ändringar sparades",
    saveLabel: "Spara ändringar",
    saveErrorGeneric: "Ändringarna kunde inte sparas",

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
    amountRequired: "Belopp krävs",
    amountInvalid: "Ogiltigt belopp",
    categoryRequired: "Kategori krävs",
    fixValidationErrors: "Rätta valideringsfel innan du sparar",
    addExpenseToGroup: "Lägg till i {category}",
    inlineCreateHeading: "Ny rad i {category}",
    createSuccess: "Raden har lagts till",
    createErrorGeneric: "Det gick inte att lägga till raden",
  },

  en: {
    closePeriodEditor: "Close period editor",
    editPeriodAriaLabel: "Edit period {periodLabel}",
    incomeTitle: "Income",
    incomeDescription: "Adjust income for the open month.",
    noIncomeItems: "There are no income items to quick adjust.",
    incomeMonthOnlyHelper:
      "Quick adjustments only affect {month}. Want to change the budget plan going forward? Open planning.",

    // PR D (income depth)
    incomeGroupSalary: "Salary",
    incomeGroupHousehold: "Household income",
    incomeGroupSide: "Side income",
    incomeSalaryLockedLabel: "Locked",
    incomeNoSalaryYet:
      "No salary planned yet. Add salary in planning.",
    incomeNoHouseholdMembers:
      "No household income for this month. Add one below.",
    incomeNoSideIncome:
      "No side income for this month. Add one below.",
    incomeAddToGroup: "Add to {category}",
    incomeInlineCreateHeading: "New income in {category}",
    incomeInlineCreateNamePlaceholder: "Name",
    incomeInlineCreateAmountPlaceholder: "Amount",
    incomeInlineCreateSubmit: "Add",
    incomeInlineCreateCancel: "Cancel",
    incomeInlineCreateSaving: "Adding...",
    incomeNameRequired: "Name is required",
    incomeNameTooLong: "Name is too long",
    incomeActiveToggleLabel: "Count {name} this month",
    incomeRowInactiveHint: "Not counted this month",

    savingsTitle: "Savings",
    savingsDescription: "Adjust monthly contributions for your savings goals.",
    noSavingsGoals: "There are no savings goals to quick adjust.",
    savingsMonthOnlyHelper:
      "Quick adjustments only affect {month}. Want to change the budget plan going forward? Open planning.",
    savingsBaseTitle: "Base savings",
    savingsBaseDescription:
      "This is your fixed monthly saving before goal contributions are added.",
    savingsBaseAmountLabel: "Base savings",
    savingsBaseMonthOnlyHint: "This month has its own base amount.",
    savingsBaseApply: "Apply base savings",
    savingsGoalsSectionTitle: "Savings goals",

    debtsTitle: "Debts",
    debtsDescription: "Adjust the planned monthly payment for your debts.",
    noDebts: "There are no debts to quick adjust.",
    debtsMonthOnlyHelper:
      "Quick adjustments only affect {month}. Want to change the budget plan going forward? Open planning.",
    debtsPlannedNote:
      "Only the planned payment changes here. Balances are not updated by this flow.",
    // PR F (debt honesty): rich read model context + warnings
    debtsPlannedPaymentLabel: "Planned payment",
    debtsBalanceLabel: "Owed balance",
    debtsMinPaymentLabel: "Minimum payment",
    debtsContextReadOnlyHint:
      "Balance and minimum payment are shown for context. Update balances under Debts.",
    debtsBelowMinWarning:
      "Below the minimum payment ({amount}).",
    debtsCoversInterestAndFeesWarning:
      "Payment does not cover interest and fee. Balance is not expected to decrease this month.",
    debtsRowReadOnly:
      "This row can't be edited right now.",
    debtsOpenFullEditor: "Open debts page",

    recurringExpensesTitle: "Variable expenses",
    recurringExpensesDescription:
      "Adjust this month's variable expenses. Housing and fixed costs are managed in planning.",

    subscriptionsTitle: "Subscriptions",
    subscriptionsDescription:
      "Turn subscriptions on or off for this month and adjust the amount if needed.",

    loadingEditor: "Loading period editor...",
    loadMonthError: "Could not load this month.",
    monthClosedReadOnly: "This month is closed and cannot be edited.",
    monthOnlyHelper:
      "Changes here apply only to {month}. Want to update the budget plan going forward? Open planning.",

    footerSummaryReadOnly: "Closed month. Read-only.",
    footerSummaryEditable: "Review your changes and save them for this month.",
    footerSummaryNoChanges: "No changes to save.",

    saveSuccess: "All changes saved",
    saveLabel: "Save changes",
    saveErrorGeneric: "Could not save changes",

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
    amountRequired: "Amount is required",
    amountInvalid: "Invalid amount",
    categoryRequired: "Category is required",
    fixValidationErrors: "Fix validation errors before saving",
    addExpenseToGroup: "Add to {category}",
    inlineCreateHeading: "New row in {category}",
    createSuccess: "Row added",
    createErrorGeneric: "Could not add the row",
  },

  et: {
    closePeriodEditor: "Sulge perioodi muutja",
    editPeriodAriaLabel: "Muuda perioodi {periodLabel}",
    incomeTitle: "Tulu",
    incomeDescription: "Kohanda avatud kuu tulu.",
    noIncomeItems: "Kiireks kohandamiseks pole tulukirjeid.",
    incomeMonthOnlyHelper:
      "Kiirkohandused mõjutavad ainult perioodi {month}. Kui soovid eelarveplaani edaspidi muuta, ava planeerimine.",

    // PR D (income depth)
    incomeGroupSalary: "Palk",
    incomeGroupHousehold: "Leibkonna sissetulek",
    incomeGroupSide: "Lisatulu",
    incomeSalaryLockedLabel: "Lukus",
    incomeNoSalaryYet:
      "Palka pole veel planeeritud. Lisa palk planeerimises.",
    incomeNoHouseholdMembers:
      "Selle kuu jaoks pole leibkonna sissetulekut. Lisa allpool.",
    incomeNoSideIncome:
      "Selle kuu jaoks pole lisatulu. Lisa allpool.",
    incomeAddToGroup: "Lisa kategooriasse {category}",
    incomeInlineCreateHeading: "Uus tulu kategoorias {category}",
    incomeInlineCreateNamePlaceholder: "Nimi",
    incomeInlineCreateAmountPlaceholder: "Summa",
    incomeInlineCreateSubmit: "Lisa",
    incomeInlineCreateCancel: "Tühista",
    incomeInlineCreateSaving: "Lisamine...",
    incomeNameRequired: "Nimi on nõutud",
    incomeNameTooLong: "Nimi on liiga pikk",
    incomeActiveToggleLabel: "Arvesta {name} selle kuu jooksul",
    incomeRowInactiveHint: "Selle kuu kohta ei arvestata",

    savingsTitle: "Säästud",
    savingsDescription: "Kohanda oma säästueesmärkide kuumakseid.",
    noSavingsGoals: "Kiireks kohandamiseks pole säästueesmärke.",
    savingsMonthOnlyHelper:
      "Kiirkohandused mõjutavad ainult perioodi {month}. Kui soovid eelarveplaani edaspidi muuta, ava planeerimine.",
    savingsBaseTitle: "Põhisääst",
    savingsBaseDescription:
      "See on sinu püsiv igakuine sääst enne eesmärkide makseid.",
    savingsBaseAmountLabel: "Põhisääst",
    savingsBaseMonthOnlyHint: "Sellel kuul on eraldi põhisumma.",
    savingsBaseApply: "Salvesta põhisumma",
    savingsGoalsSectionTitle: "Säästueesmärgid",

    debtsTitle: "Võlad",
    debtsDescription: "Kohanda võlgade planeeritud kuumakset.",
    noDebts: "Kiireks kohandamiseks pole võlgu.",
    debtsMonthOnlyHelper:
      "Kiirkohandused mõjutavad ainult perioodi {month}. Kui soovid eelarveplaani edaspidi muuta, ava planeerimine.",
    debtsPlannedNote:
      "Siin muudetakse ainult planeeritud makset. Jääki see vaade ei uuenda.",
    // PR F (debt honesty): rich read model context + warnings
    debtsPlannedPaymentLabel: "Planeeritud makse",
    debtsBalanceLabel: "Tasumata jääk",
    debtsMinPaymentLabel: "Minimaalne makse",
    debtsContextReadOnlyHint:
      "Jääk ja minimaalne makse on siin ainult info. Jääki saab uuendada võlgade lehel.",
    debtsBelowMinWarning:
      "Alla miinimummakse ({amount}).",
    debtsCoversInterestAndFeesWarning:
      "Makse ei kata intressi ja tasu. Jääk sel kuul tõenäoliselt ei vähene.",
    debtsRowReadOnly:
      "Seda rida ei saa praegu muuta.",
    debtsOpenFullEditor: "Ava võlgade leht",

    recurringExpensesTitle: "Muutuvad kulud",
    recurringExpensesDescription:
      "Kohanda selle kuu muutuvaid kulusid. Eluaseme- ja püsikulud hallatakse planeerimise vaates.",

    subscriptionsTitle: "Tellimused",
    subscriptionsDescription:
      "Lülita selle kuu tellimusi sisse või välja ja muuda vajadusel summat.",

    loadingEditor: "Perioodi muutja laadimine...",
    loadMonthError: "Seda kuud ei saanud laadida.",
    monthClosedReadOnly: "See kuu on suletud ja seda ei saa muuta.",
    monthOnlyHelper:
      "Siinsed muudatused kehtivad ainult perioodile {month}. Kui soovid eelarveplaani edaspidi uuendada, ava planeerimine.",

    footerSummaryReadOnly: "Suletud kuu. Ainult vaatamiseks.",
    footerSummaryEditable:
      "Vaata muudatused üle ja salvesta need selle kuu jaoks.",
    footerSummaryNoChanges: "Muudatusi pole salvestamiseks.",

    saveSuccess: "Kõik muudatused salvestati",
    saveLabel: "Salvesta muudatused",
    saveErrorGeneric: "Muudatusi ei saanud salvestada",

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
    amountRequired: "Summa on nõutud",
    amountInvalid: "Vigane summa",
    categoryRequired: "Kategooria on nõutud",
    fixValidationErrors: "Paranda validerimisvead enne salvestamist",
    addExpenseToGroup: "Lisa kategooriasse {category}",
    inlineCreateHeading: "Uus rida kategoorias {category}",
    createSuccess: "Rida lisatud",
    createErrorGeneric: "Rida ei õnnestunud lisada",
  },
} as const;
