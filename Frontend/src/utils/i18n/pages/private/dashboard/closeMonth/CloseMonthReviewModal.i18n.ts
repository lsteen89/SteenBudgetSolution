export const closeMonthReviewModalDict = {
  sv: {
    snapshotLabel: "Månadsstängning",
    title: "Redo att låsa {month}?",
    description:
      "När du stänger månaden sparas en skrivskyddad ögonblicksbild som du alltid kan gå tillbaka till.",
    balancedHeadline: "Perfekt balans.",
    balancedBody: "Varje krona har ett jobb och månaden är redo att låsas.",

    positiveHeadline: "Du har {amount} kvar att fördela.",
    resolverBody:
      "Varje krona behöver ett jobb. Hur vill du hantera överskottet?",
    addToEmergencyFund: "Lägg till i {fund}",
    carryOverToNext: "För över till {month}",
    resolvingEmergencyFund: "Lägger till i {fund}...",
    resolvingCarryOver: "Förbereder överföring till {month}...",
    resolvedEmergencyFundHeadline: "{amount} tilldelat till {fund}",
    resolvedEmergencyFundBody:
      "Bra. Ditt överskott har nu ett tydligt syfte innan månaden låses.",
    resolvedCarryOverHeadline: "{amount} kommer att föras över till {month}",
    resolvedCarryOverBody: "Bra. Överskottet förs vidare när månaden låses.",

    negativeHeadline: "Månaden är överspenderad med {amount}.",
    negativeBody:
      "Granska inkomster, utgifter eller sparande och skulder innan du stänger, eller lås månaden och behåll resultatet i ögonblicksbilden.",

    checklistTitle: "Är dina siffror uppdaterade?",
    edit: "Ändra",

    footerBalanced: "{month} är redo att låsas.",
    footerPositiveUnresolved:
      "Om du låser nu kommer {amount} att förbli ofördelat i ögonblicksbilden för {month}.",
    footerResolvedEmergencyFund: "{amount} har tilldelats till {fund}.",
    footerResolvedCarryOver:
      "{amount} förs över till {month} när du låser perioden.",
    footerNegative:
      "Om du låser nu kommer underskottet på {amount} att finnas kvar i ögonblicksbilden för {month}.",

    confirm: "Lås {month}",
    cancel: "Avbryt",
    emergencyFundFallback: "Nödfond",
    closeMonthSuccessToast: "{month} visas nu efter att månaden låsts.",
  },

  en: {
    snapshotLabel: "Month close review",
    title: "Ready to lock in {month}?",
    description:
      "Closing this month saves a read-only snapshot that you can revisit at any time.",
    balancedHeadline: "Perfect balance.",
    balancedBody:
      "Every krona is accounted for and this month is ready to lock.",

    positiveHeadline: "You have {amount} left to allocate.",
    resolverBody:
      "Every krona needs a job. How do you want to handle this surplus?",
    addToEmergencyFund: "Add to {fund}",
    carryOverToNext: "Carry over to {month}",
    resolvingEmergencyFund: "Adding to {fund}...",
    resolvingCarryOver: "Preparing carry over to {month}...",
    resolvedEmergencyFundHeadline: "{amount} assigned to {fund}",
    resolvedEmergencyFundBody:
      "Great. Your surplus now has a clear purpose before this month is locked.",
    resolvedCarryOverHeadline: "{amount} will carry over to {month}",
    resolvedCarryOverBody:
      "Great. This surplus will move forward when this month is locked.",

    negativeHeadline: "This month is overspent by {amount}.",
    negativeBody:
      "Review income, expenses, or savings and debt before closing, or lock the month and keep this result in the snapshot.",

    checklistTitle: "Are your numbers up to date?",
    edit: "Edit",

    footerBalanced: "{month} is ready to lock.",
    footerPositiveUnresolved:
      "If you lock now, {amount} will remain unassigned in the {month} snapshot.",
    footerResolvedEmergencyFund: "{amount} has been assigned to {fund}.",
    footerResolvedCarryOver:
      "{amount} will carry over into {month} when you lock this period.",
    footerNegative:
      "If you lock now, the deficit of {amount} will remain in the {month} snapshot.",

    confirm: "Lock {month}",
    cancel: "Cancel",
    emergencyFundFallback: "Emergency fund",
    closeMonthSuccessToast: "Month closed. You're now viewing {month}.",
  },

  et: {
    snapshotLabel: "Kuu sulgemise ülevaade",
    title: "Kas oled valmis {month} lukustama?",
    description:
      "Kuu sulgemisel salvestatakse kirjutuskaitstud hetkeseis, mida saad igal ajal uuesti vaadata.",
    balancedHeadline: "Täiuslik tasakaal.",
    balancedBody: "Iga kroon on arvel ja kuu on lukustamiseks valmis.",

    positiveHeadline: "Sul on veel {amount} jaotamata.",
    resolverBody:
      "Iga kroon vajab eesmärki. Kuidas soovid selle ülejäägi lahendada?",
    addToEmergencyFund: "Lisa see fondi {fund}",
    carryOverToNext: "Kanna üle kuusse {month}",
    resolvingEmergencyFund: "Lisan fondi {fund}...",
    resolvingCarryOver: "Valmistan ülekannet kuusse {month}...",
    resolvedEmergencyFundHeadline: "{amount} suunati fondi {fund}",
    resolvedEmergencyFundBody:
      "Väga hea. Sinu ülejääk sai enne kuu lukustamist selge eesmärgi.",
    resolvedCarryOverHeadline: "{amount} kantakse üle kuusse {month}",
    resolvedCarryOverBody:
      "Väga hea. See ülejääk liigub edasi, kui kuu lukustad.",

    negativeHeadline: "See kuu on {amount} miinuses.",
    negativeBody:
      "Vaata enne sulgemist üle tulud, kulud või säästud ja võlad, või lukusta kuu ning säilita see tulemus hetkeseisus.",

    checklistTitle: "Kas sinu numbrid on ajakohased?",
    edit: "Muuda",

    footerBalanced: "{month} on lukustamiseks valmis.",
    footerPositiveUnresolved:
      "Kui lukustad nüüd, jääb {amount} kuu {month} hetkeseisus jaotamata.",
    footerResolvedEmergencyFund: "{amount} on suunatud fondi {fund}.",
    footerResolvedCarryOver:
      "{amount} kantakse kuusse {month} üle, kui selle perioodi lukustad.",
    footerNegative:
      "Kui lukustad nüüd, jääb puudujääk summas {amount} kuu {month} hetkeseisu.",

    confirm: "Lukusta {month}",
    cancel: "Tühista",
    emergencyFundFallback: "Hädaabifond",
    closeMonthSuccessToast: "Kuu on suletud. Nüüd kuvame kuud {month}.",
  },
} as const;
