/**
 * Copy for the income editor drawer.
 *
 * Naming is locked by the designer handover: `Sidoinkomst` (not `Sidointäkt`),
 * `Fritt kvar`, and no implementation words (`baseline`, `default`, `source`,
 * `linked row`, `paused`, `cancelled`, or `subscription`). The scope-disabled
 * hint must read as the handover-approved
 * `Inte tillgängligt — den här raden finns inte i planen.`
 */
export const incomeItemModalDict = {
  sv: {
    eyebrow: "Inkomst",
    titleCreate: "Lägg till inkomst",
    titleEdit: "Redigera inkomst",
    // Mode-specific subtitle copy. Global add (no `presetKind`) tells the user
    // they pick the type here; group add (`presetKind` set from the group)
    // hides the selector and says the row will land in the open month only.
    descriptionEdit: "Justera belopp och om posten ska räknas i månaden.",
    // Both create variants used to imply "Skapas bara i {month}" — that's
    // only true now when the user picks the `currentMonthOnly` scope card.
    // The scope cards themselves carry the month vs plan choice, so the
    // subtitle drops the implication.
    descriptionCreateGlobal:
      "Välj typ av inkomst och fyll i beloppet.",
    descriptionCreateGroup:
      "Fyll i belopp och välj om den ska ingå i budgetplanen.",
    closeAriaLabel: "Stäng inkomstmodal",
    kindLabel: "Typ av inkomst",
    sideHustleOption: "Sidoinkomst",
    householdMemberOption: "Hushållsinkomst",
    nameLabel: "Namn",
    amountLabel: "Belopp per månad",
    activeLabel: "Räknas i månaden",
    activeDescription: "Stäng av om posten inte ska räknas denna månad.",
    inactiveDescription: "Posten finns kvar men räknas inte med just nu.",
    salaryNameHint: "Namnet på din lön kan inte ändras.",
    salaryActiveHint: "Din lön är alltid aktiv.",
    create: "Lägg till",
    saveChanges: "Spara",
    saving: "Sparar...",
    cancel: "Avbryt",
    // Disabled-scope hint shown when the row has no plan source row. The
    // handover-approved copy avoids the words `baseline` / `source` / `plan
    // row` and reads as a calm "this row doesn't exist in the plan" cue.
    scopePlanDisabledHint:
      "Inte tillgängligt — den här raden finns inte i planen.",
    monthOnlyCreate: "Gäller bara {month}. Den här posten läggs bara till i {month}.",
    // Create-scope card copy. Locked Swedish labels per the task spec:
    //   "Gäller bara {month}"            (currentMonthOnly)
    //   "Lägg även till i budgetplanen framåt"  (currentMonthAndBudgetPlan)
    // Cards default to the recurring choice because income is usually
    // recurring; month-only should be an intentional alternative.
    createScopeLegend: "Lägg till i",
    createScopeCurrentMonthOnlyLabel: "Gäller bara {month}",
    createScopeCurrentMonthOnlyHelp:
      "Den här posten räknas bara i {month}. Budgetplanen framåt påverkas inte.",
    createScopeCurrentMonthAndBudgetPlanLabel:
      "Lägg även till i budgetplanen framåt",
    createScopeCurrentMonthAndBudgetPlanHelp:
      "Posten räknas i {month} och tas med automatiskt i kommande månader.",
    // Preview line that reacts to the scope choice in create mode. Scope is
    // independent of the active toggle: "Återkommande" describes the plan
    // intent; the row above describes current-month inclusion.
    previewScopeCurrentMonthOnly: "Bara denna månad",
    previewScopeCurrentMonthAndBudgetPlan: "Återkommande i budgetplanen",
    nameRequired: "Namn krävs",
    amountInvalid: "Ange ett giltigt belopp",
    previewLabel: "Förhandsvisning",
    previewUntitled: "Ny inkomst",
    previewSubtitleSalary: "Lön",
    previewSubtitleSideHustle: "Sidoinkomst",
    previewSubtitleHouseholdMember: "Hushållsinkomst",
    previewStatusActive: "Räknas i {month}",
    previewStatusInactive: "Inaktiv denna månad",
  },
  en: {
    eyebrow: "Income",
    titleCreate: "Add income",
    titleEdit: "Edit income",
    descriptionEdit:
      "Adjust the amount and whether this item counts this month.",
    descriptionCreateGlobal:
      "Pick a type of income and fill in the amount.",
    descriptionCreateGroup:
      "Fill in the amount and choose whether it belongs in the budget plan.",
    closeAriaLabel: "Close income modal",
    kindLabel: "Type of income",
    sideHustleOption: "Side income",
    householdMemberOption: "Household income",
    nameLabel: "Name",
    amountLabel: "Monthly amount",
    activeLabel: "Counts this month",
    activeDescription: "Turn off if the row should not count this month.",
    inactiveDescription: "The row is kept but not counted right now.",
    salaryNameHint: "Your salary name cannot be changed.",
    salaryActiveHint: "Your salary is always active.",
    create: "Add",
    saveChanges: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    scopePlanDisabledHint:
      "Unavailable — this row does not exist in the plan.",
    monthOnlyCreate: "Only for {month}. This item is added to {month} only.",
    createScopeLegend: "Add to",
    createScopeCurrentMonthOnlyLabel: "Only for {month}",
    createScopeCurrentMonthOnlyHelp:
      "Counts in {month} only. The budget plan going forward is not changed.",
    createScopeCurrentMonthAndBudgetPlanLabel:
      "Also add to the budget plan going forward",
    createScopeCurrentMonthAndBudgetPlanHelp:
      "Counts in {month} and is included automatically in upcoming months.",
    previewScopeCurrentMonthOnly: "This month only",
    previewScopeCurrentMonthAndBudgetPlan: "Recurring in the budget plan",
    nameRequired: "Name is required",
    amountInvalid: "Enter a valid amount",
    previewLabel: "Preview",
    previewUntitled: "New income",
    previewSubtitleSalary: "Salary",
    previewSubtitleSideHustle: "Side income",
    previewSubtitleHouseholdMember: "Household income",
    previewStatusActive: "Counts in {month}",
    previewStatusInactive: "Inactive this month",
  },
  et: {
    eyebrow: "Tulu",
    titleCreate: "Lisa tulu",
    titleEdit: "Muuda tulu",
    descriptionEdit:
      "Muuda summat ja seda, kas kirje läheb selle kuu arvestusse.",
    descriptionCreateGlobal:
      "Vali tulu tüüp ja sisesta summa.",
    descriptionCreateGroup:
      "Sisesta summa ja vali, kas see kuulub eelarveplaani.",
    closeAriaLabel: "Sulge tulu modal",
    kindLabel: "Tulu tüüp",
    sideHustleOption: "Lisatulu",
    householdMemberOption: "Leibkonna tulu",
    nameLabel: "Nimi",
    amountLabel: "Kuu summa",
    activeLabel: "Arvestatakse selles kuus",
    activeDescription: "Lülita välja, kui kirjet ei tohiks selles kuus arvestada.",
    inactiveDescription: "Kirje on alles, kuid praegu seda ei arvestata.",
    salaryNameHint: "Sinu palga nime ei saa muuta.",
    salaryActiveHint: "Sinu palk on alati aktiivne.",
    create: "Lisa",
    saveChanges: "Salvesta",
    saving: "Salvestamine...",
    cancel: "Tühista",
    scopePlanDisabledHint:
      "Pole saadaval — seda rida pole plaanis olemas.",
    monthOnlyCreate: "Ainult {month}. Kirje lisatakse ainult kuusse {month}.",
    createScopeLegend: "Lisa kuhu",
    createScopeCurrentMonthOnlyLabel: "Ainult kuus {month}",
    createScopeCurrentMonthOnlyHelp:
      "Arvestatakse ainult kuus {month}. Edaspidist eelarveplaani see ei muuda.",
    createScopeCurrentMonthAndBudgetPlanLabel:
      "Lisa ka eelarveplaani edaspidi",
    createScopeCurrentMonthAndBudgetPlanHelp:
      "Arvestatakse kuus {month} ja kantakse automaatselt järgmistesse kuudesse.",
    previewScopeCurrentMonthOnly: "Ainult sel kuul",
    previewScopeCurrentMonthAndBudgetPlan: "Korduv eelarveplaanis",
    nameRequired: "Nimi on kohustuslik",
    amountInvalid: "Sisesta kehtiv summa",
    previewLabel: "Eelvaade",
    previewUntitled: "Uus tulu",
    previewSubtitleSalary: "Palk",
    previewSubtitleSideHustle: "Lisatulu",
    previewSubtitleHouseholdMember: "Leibkonna tulu",
    previewStatusActive: "Arvestatakse kuus {month}",
    previewStatusInactive: "Mitteaktiivne sel kuul",
  },
} as const;
