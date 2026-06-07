/**
 * i18n dictionary for the open-month Pillar Workbench (P3).
 *
 * The workbench replaces the four legacy `OpenMonthPillarCard`s with a denser
 * 2x2 (single-column on mobile) layout: each pillar now exposes a small,
 * planned-budget signal stack on top of its monthly total, plus one
 * quick-adjust action and one full editor route.
 *
 * Copy rules:
 *  - Planned-budget language only. No "spent so far", "remaining to spend",
 *    transactions, due dates, burn rate.
 *  - Subscriptions / recurring chips describe what is planned, not what has
 *    already been charged.
 *  - Strategy/empty states are honest. "No goals" does not imply criticism.
 */
export const pillarWorkbenchDict = {
  en: {
    sectionEyebrow: "This month by area",
    sectionHint:
      "Each pillar shows what is planned for the month. Quick adjust patches this month only; the full editor opens every control for this area.",

    incomeTitle: "Income",
    expensesTitle: "Expenses",
    savingsTitle: "Savings",
    debtsTitle: "Debts",

    incomeAmountAria: "Planned income this month",
    expensesAmountAria: "Planned expenses this month",
    savingsAmountAria: "Planned savings this month",
    debtsAmountAria: "Planned debt payments this month",

    incomeSubtitleSources: "{count} source planned",
    incomeSubtitleSourcesOther: "{count} sources planned",
    incomeSubtitleNone: "No income planned for this month yet.",

    expensesSubtitleCategories: "{count} category planned",
    expensesSubtitleCategoriesOther: "{count} categories planned",
    expensesSubtitleNone: "No expenses planned for this month yet.",

    savingsSubtitle: "{percent}% of all goal targets are funded.",
    savingsSubtitleNoGoals: "No active goals — base saving only.",
    savingsSubtitleNone: "No savings planned for this month yet.",

    debtsSubtitleCount: "{count} debt in the plan",
    debtsSubtitleCountOther: "{count} debts in the plan",
    debtsSubtitleNone: "No debts in the plan.",

    signalSalary: "Net salary",
    signalSide: "Side income",
    signalHousehold: "Household",
    signalTopCategories: "Top categories",
    signalSubscriptions: "Subscriptions",
    signalSubscriptionsValue: "{count} · {monthly}/mo · {annual}/yr",
    signalRecurring: "Recurring items",
    signalRecurringValue: "{count} · {monthly}/mo",
    signalNoSubscriptions: "No subscriptions in the plan.",
    signalMonthlySaving: "Monthly saving",
    signalGoalContributions: "Goal contributions",
    signalGoalsProgress: "Goal progress",
    signalGoalsProgressAria: "Goal progress {percent}%",
    signalActiveGoals: "{count} active goal",
    signalActiveGoalsOther: "{count} active goals",
    signalMonthlyPayment: "Monthly payment",
    signalTotalBalance: "Total balance",
    signalStrategy: "Strategy",
    strategyAvalanche: "Avalanche",
    strategySnowball: "Snowball",
    strategyNoAction: "No active strategy",
    strategyUnknown: "Strategy not set",

    actionQuickAdjustIncome: "Quick adjust income",
    actionQuickAdjustExpenses: "Quick adjust expenses",
    actionQuickAdjustSavings: "Quick adjust savings",
    actionQuickAdjustDebts: "Quick adjust debts",
    actionEditIncome: "Edit all income",
    actionEditExpenses: "Edit all expenses",
    actionEditSavings: "Manage all savings",
    actionEditDebts: "Manage all debts",
  },

  sv: {
    sectionEyebrow: "Månaden per område",
    sectionHint:
      "Varje område visar vad som är planerat den här månaden. Snabbjustera ändrar bara denna månad, full redigering öppnar alla kontroller för området.",

    incomeTitle: "Inkomster",
    expensesTitle: "Utgifter",
    savingsTitle: "Sparande",
    debtsTitle: "Skulder",

    incomeAmountAria: "Planerade inkomster denna månad",
    expensesAmountAria: "Planerade utgifter denna månad",
    savingsAmountAria: "Planerat sparande denna månad",
    debtsAmountAria: "Planerade skuldbetalningar denna månad",

    incomeSubtitleSources: "{count} källa planerad",
    incomeSubtitleSourcesOther: "{count} källor planerade",
    incomeSubtitleNone: "Inga inkomster är planerade denna månad ännu.",

    expensesSubtitleCategories: "{count} kategori planerad",
    expensesSubtitleCategoriesOther: "{count} kategorier planerade",
    expensesSubtitleNone: "Inga utgifter är planerade denna månad ännu.",

    savingsSubtitle: "{percent}% av alla målsatta belopp är finansierade.",
    savingsSubtitleNoGoals: "Inga aktiva mål — endast bassparande.",
    savingsSubtitleNone: "Inget sparande är planerat denna månad ännu.",

    debtsSubtitleCount: "{count} skuld i planen",
    debtsSubtitleCountOther: "{count} skulder i planen",
    debtsSubtitleNone: "Inga skulder i planen.",

    signalSalary: "Nettolön",
    signalSide: "Övrig inkomst",
    signalHousehold: "Hushåll",
    signalTopCategories: "Största kategorier",
    signalSubscriptions: "Prenumerationer",
    signalSubscriptionsValue: "{count} · {monthly}/mån · {annual}/år",
    signalRecurring: "Återkommande poster",
    signalRecurringValue: "{count} · {monthly}/mån",
    signalNoSubscriptions: "Inga prenumerationer i planen.",
    signalMonthlySaving: "Bassparande",
    signalGoalContributions: "Målsparande",
    signalGoalsProgress: "Måluppfyllelse",
    signalGoalsProgressAria: "Måluppfyllelse {percent}%",
    signalActiveGoals: "{count} aktivt mål",
    signalActiveGoalsOther: "{count} aktiva mål",
    signalMonthlyPayment: "Månadsbetalning",
    signalTotalBalance: "Totalt skuldsaldo",
    signalStrategy: "Strategi",
    strategyAvalanche: "Avalanche",
    strategySnowball: "Snowball",
    strategyNoAction: "Ingen aktiv strategi",
    strategyUnknown: "Strategi ej vald",

    actionQuickAdjustIncome: "Snabbjustera inkomster",
    actionQuickAdjustExpenses: "Snabbjustera utgifter",
    actionQuickAdjustSavings: "Snabbjustera sparande",
    actionQuickAdjustDebts: "Snabbjustera skulder",
    actionEditIncome: "Redigera alla inkomster",
    actionEditExpenses: "Redigera alla utgifter",
    actionEditSavings: "Hantera allt sparande",
    actionEditDebts: "Hantera alla skulder",
  },

  et: {
    sectionEyebrow: "See kuu valdkondade kaupa",
    sectionHint:
      "Iga valdkond näitab, mis on selleks kuuks planeeritud. Kiirkohandus muudab ainult seda kuud, täisredaktor avab kõik selle valdkonna juhtelemendid.",

    incomeTitle: "Tulu",
    expensesTitle: "Kulud",
    savingsTitle: "Säästud",
    debtsTitle: "Võlad",

    incomeAmountAria: "Selle kuu planeeritud tulu",
    expensesAmountAria: "Selle kuu planeeritud kulud",
    savingsAmountAria: "Selle kuu planeeritud säästud",
    debtsAmountAria: "Selle kuu planeeritud võlamaksed",

    incomeSubtitleSources: "{count} allikas planeeritud",
    incomeSubtitleSourcesOther: "{count} allikat planeeritud",
    incomeSubtitleNone: "Selle kuu jaoks pole veel tulu planeeritud.",

    expensesSubtitleCategories: "{count} kategooria planeeritud",
    expensesSubtitleCategoriesOther: "{count} kategooriat planeeritud",
    expensesSubtitleNone: "Selle kuu jaoks pole veel kulusid planeeritud.",

    savingsSubtitle: "{percent}% kõikidest eesmärkidest on kaetud.",
    savingsSubtitleNoGoals: "Aktiivseid eesmärke pole — ainult baassääst.",
    savingsSubtitleNone: "Selle kuu jaoks pole veel sääste planeeritud.",

    debtsSubtitleCount: "{count} võlg plaanis",
    debtsSubtitleCountOther: "{count} võlga plaanis",
    debtsSubtitleNone: "Plaanis pole võlgu.",

    signalSalary: "Netopalk",
    signalSide: "Kõrvaltulu",
    signalHousehold: "Leibkond",
    signalTopCategories: "Suurimad kategooriad",
    signalSubscriptions: "Tellimused",
    signalSubscriptionsValue: "{count} · {monthly}/kuu · {annual}/aasta",
    signalRecurring: "Püsikulud",
    signalRecurringValue: "{count} · {monthly}/kuu",
    signalNoSubscriptions: "Plaanis pole tellimusi.",
    signalMonthlySaving: "Baassääst",
    signalGoalContributions: "Eesmärkide sissemaksed",
    signalGoalsProgress: "Eesmärkide täitumine",
    signalGoalsProgressAria: "Eesmärkide täitumine {percent}%",
    signalActiveGoals: "{count} aktiivne eesmärk",
    signalActiveGoalsOther: "{count} aktiivset eesmärki",
    signalMonthlyPayment: "Kuumakse",
    signalTotalBalance: "Võlasaldo kokku",
    signalStrategy: "Strateegia",
    strategyAvalanche: "Lumelaviin",
    strategySnowball: "Lumepall",
    strategyNoAction: "Aktiivset strateegiat pole",
    strategyUnknown: "Strateegia pole valitud",

    actionQuickAdjustIncome: "Kiirkohanda tulu",
    actionQuickAdjustExpenses: "Kiirkohanda kulusid",
    actionQuickAdjustSavings: "Kiirkohanda sääste",
    actionQuickAdjustDebts: "Kiirkohanda võlgu",
    actionEditIncome: "Muuda kogu tulu",
    actionEditExpenses: "Muuda kõiki kulusid",
    actionEditSavings: "Halda kõiki sääste",
    actionEditDebts: "Halda kõiki võlgu",
  },
} as const;
