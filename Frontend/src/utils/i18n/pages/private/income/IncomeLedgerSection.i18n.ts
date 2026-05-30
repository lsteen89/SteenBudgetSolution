/**
 * Copy for the grouped income ledger sections.
 *
 * The three group keys mirror `BudgetMonthIncomeItemKind` 1:1 — `salary`,
 * `householdMember`, and `sideHustle`. Naming is locked by the designer
 * handover: `Sidoinkomst`, not `Sidointäkt`. No banned implementation words
 * (baseline / default / source / paused / cancelled / subscription) appear
 * in user copy.
 */
export const incomeLedgerSectionDict = {
  sv: {
    salaryTitle: "Lön",
    salaryDescription: "Din återkommande huvudsakliga inkomst.",
    householdMemberTitle: "Hushållsinkomst",
    householdMemberDescription:
      "Inkomster från hushållet som räknas in i budgeten.",
    sideHustleTitle: "Sidoinkomst",
    sideHustleDescription: "Extra inkomster som kan variera mellan månader.",
    activeCountOne: "{count} aktiv",
    activeCountOther: "{count} aktiva",
    inactiveCountOne: "{count} inaktiv",
    inactiveCountOther: "{count} inaktiva",
    total: "Totalt",
    perMonth: "Per månad",
    addInGroup: "Lägg till",
    toggleGroup: "Visa eller dölj grupp",
    empty: "Inga rader i den här gruppen.",
    emptyActive: "Inga aktiva rader i den här gruppen.",
    emptySalary: "Ingen lön planerad ännu.",
    inactiveSublabel: "Inaktiva — räknas inte i totalen för {month}",
  },
  en: {
    salaryTitle: "Salary",
    salaryDescription: "Your recurring main income.",
    householdMemberTitle: "Household income",
    householdMemberDescription:
      "Income from your household that counts in the budget.",
    sideHustleTitle: "Side income",
    sideHustleDescription:
      "Extra income that may vary between months.",
    activeCountOne: "{count} active",
    activeCountOther: "{count} active",
    inactiveCountOne: "{count} inactive",
    inactiveCountOther: "{count} inactive",
    total: "Total",
    perMonth: "Per month",
    addInGroup: "Add",
    toggleGroup: "Show or hide group",
    empty: "No rows in this group.",
    emptyActive: "No active rows in this group.",
    emptySalary: "No salary planned yet.",
    inactiveSublabel: "Inactive — not counted in {month}'s total",
  },
  et: {
    salaryTitle: "Palk",
    salaryDescription: "Sinu korduv põhitulu.",
    householdMemberTitle: "Leibkonna tulu",
    householdMemberDescription:
      "Leibkonna tulud, mida arvestatakse eelarves.",
    sideHustleTitle: "Lisatulu",
    sideHustleDescription: "Lisatulu, mis võib kuude lõikes erineda.",
    activeCountOne: "{count} aktiivne",
    activeCountOther: "{count} aktiivset",
    inactiveCountOne: "{count} mitteaktiivne",
    inactiveCountOther: "{count} mitteaktiivset",
    total: "Kokku",
    perMonth: "Kuus",
    addInGroup: "Lisa",
    toggleGroup: "Näita või peida grupp",
    empty: "Selles grupis ridu pole.",
    emptyActive: "Selles grupis aktiivseid ridu pole.",
    emptySalary: "Palka pole veel planeeritud.",
    inactiveSublabel: "Mitteaktiivsed — ei loeta kuu {month} kogusummasse",
  },
} as const;
