export const nextMonthPreviewDict = {
  sv: {
    back: "Tillbaka till översikten",

    // header
    kicker: "Nästa månad",
    previewBadge: "Förhandsvisning",
    previewNothingSaved: "Förhandsvisning — inget sparat",
    plannedBadge: "Planerad",
    openBadge: "Öppen",
    // appended after the month label, e.g. "juni 2026 · Förhandsvisning"
    titleSeparator: "·",
    intro:
      "Det här är inte din aktiva månad. Så här ser nästa månad ut om budgetplanen inte ändras.",

    // money state
    remainingLabel: "Fritt att fördela",
    freeInMonth: "Fritt att fördela i {month}",
    shortInMonth: "Underskott i {month}",
    fromBudgetPlan: "Från budgetplanen",
    estimatedAbbr: "est.",
    toneWordPositive: "fritt att fördela",
    toneWordZero: "allt är fördelat",
    toneWordNegative: "underskott",
    helperPositive:
      "Det här blir kvar nästa månad när hela budgetplanen är finansierad.",
    helperZero: "Varje krona i budgetplanen är redan intecknad nästa månad.",
    helperNegative:
      "Budgetplanen går inte ihop nästa månad. Inget är överspenderat – det är en plan, inte utfall.",

    // equation
    equationAria: "Så räknas nästa månad fram",
    equationIncome: "Inkomster",
    equationCarryOver: "Överfört",
    equationExpenses: "Utgifter",
    equationSavings: "Sparande",
    equationDebts: "Skuldbetalningar",
    equationRemaining: "Fritt kvar",
    equationPlus: "+",
    equationMinus: "−",
    equationEquals: "=",

    // allocation bar
    allocationCaption: "Så här fördelas nästa månad",
    allocationAria: "Fördelning av nästa månads pengar",
    allocationExpenses: "Utgifter",
    allocationSavings: "Sparande",
    allocationDebts: "Skulder",
    allocationFree: "Fritt",
    allocationRunsOut: "Här tar pengarna slut",

    // carry-over assumption — {month} and {amount} are interpolated
    carryAssumption:
      "Bygger på att {month} stängs med {amount} kvar. Beloppen fastställs när månaden stängs.",
    basisNote: "Projicerat från din budgetplan, utan att något ändrats.",

    comparisonKicker: "Jämfört med {month}",
    comparisonTitle: "Varför {month} ser annorlunda ut",
    comparisonCount: "{count} ändringar",
    termsCount: "5 delar",
    comparisonNoChanges: "Inga större skillnader mot den öppna månaden.",
    delta_income: "Inkomster ändras i nästa månads plan.",
    delta_carryOver: "Överfört belopp är fortfarande uppskattat.",
    delta_expenses: "Utgifter skiljer sig från den öppna månaden.",
    delta_savings: "Sparande skiljer sig från den öppna månaden.",
    delta_debts: "Skuldbetalningar skiljer sig från den öppna månaden.",

    lifecycleKicker: "Så blir {month} verklig",
    lifecyclePreviewTitle: "Förhandsvisning",
    lifecyclePreviewBody: "Projicerad från budgetplanen. Skrivskyddad, inget sparat.",
    lifecyclePlannedTitle: "Planerad",
    lifecyclePlannedBody: "En riktig {month} som kan justeras innan den öppnas.",
    lifecycleOpenTitle: "Öppen",
    lifecycleOpenBody:
      "När {from} stängs tar {month} över och överfört belopp blir slutligt.",

    // planning actions
    startPlanningKicker: "När du är redo",
    startPlanningTitle: "Börja planera {month}",
    startPlanningBody:
      "Skapa en planerad version av {month} så att du kan justera den innan {from} stängs. {from} är fortsatt öppen.",
    startPlanningDeficitBody:
      "Just nu saknar {month} {amount}. Skapa en planerad version så att du kan justera den innan {from} stängs. {from} är fortsatt öppen.",
    startStepCreate: "Skapar en planerad {month} från budgetplanen",
    startStepAdjust:
      "Justera inkomster, utgifter, sparande och skulder bara för {month}",
    startStepOpen: "{month} är fortsatt öppen och stängs senare som vanligt",
    startPlanningAction: "Börja planera nästa månad",
    startPlanningPending: "Skapar planerad månad",
    startPlanningRetry: "Försök igen",
    startPlanningError:
      "Kunde inte skapa den planerade månaden. Försök igen.",
    startPlanningSafeNote:
      "Inga pengar flyttas. Det här skapar bara {month} för redigering.",
    forwardNoteTitle: "Behöver ändringen gälla varje månad?",
    forwardNoteBody:
      "Öppna rätt redigerare och välj budgetplanen framåt på raden du ändrar. Stängda månader ändras aldrig.",
    confirmClose: "Stäng",
    confirmTitle: "Skapa planerad {month}?",
    confirmBody:
      "Det här skapar en redigerbar planerad månad från budgetplanen. {from} är fortsatt öppen. Slutligt överfört belopp sätts när {from} stängs.",
    confirmCancel: "Inte nu",
    confirmPending: "Skapar",
    confirmAction: "Skapa planerad månad",
    // success ribbon after the planned month is created — {month} interpolated
    plannedSuccessTitle: "{month} är planerad",
    plannedSuccessBody: "Du kan nu justera månaden innan den öppnas.",
    plannedIntro:
      "Den här månaden är planerad och kan redigeras innan den blir aktiv.",
    editActionsKicker: "Planera månaden",
    editActionsTitle: "Redigera planerad månad",
    editNextMonthOnlyTitle: "Redigera bara nästa månad",
    editNextMonthOnlyBody:
      "Öppnar fulla redigeraren för den planerade månaden. Ändringar gäller bara den månaden om du inte väljer plan framåt i redigeraren.",
    updatePlanForwardTitle: "Uppdatera budgetplanen framåt",
    updatePlanForwardBody:
      "Budgetplanen ändras inte här. Välj plan framåt inne i redigeraren bara när ändringen ska gälla kommande månader.",
    monthOnlyScope: "Gäller bara {month}",
    planForwardScope: "Budgetplanen framåt",
    editIncome: "Inkomster",
    editExpenses: "Utgifter",
    editSavings: "Sparande",
    editDebts: "Skulder",
    editRowMeta: "Öppnar full redigerare för planerad månad",
    editRowAction: "Öppna",

    // unavailable
    unavailableTitle: "Ingen förhandsvisning ännu",
    unavailableBody:
      "Förhandsvisningen av nästa månad är tillgänglig när du har en öppen månad att utgå från.",

    // empty budget plan
    emptyTitle: "Ingen budgetplan ännu",
    emptyBody:
      "Lägg till inkomster och utgifter i din budgetplan för att se en förhandsvisning av nästa månad.",

    // error
    errorTitle: "Kunde inte ladda förhandsvisningen",
    errorFallback: "Försök igen om en stund.",
  },

  en: {
    back: "Back to overview",

    kicker: "Next month",
    previewBadge: "Preview",
    previewNothingSaved: "Preview — nothing saved",
    plannedBadge: "Planned",
    openBadge: "Open",
    titleSeparator: "·",
    intro:
      "This is not your active month. Here is what next month looks like if your budget plan doesn't change.",

    remainingLabel: "Free to allocate",
    freeInMonth: "Free to allocate in {month}",
    shortInMonth: "Short in {month}",
    fromBudgetPlan: "From your budget plan",
    estimatedAbbr: "est.",
    toneWordPositive: "free to allocate",
    toneWordZero: "fully assigned",
    toneWordNegative: "short",
    helperPositive:
      "This is what stays free next month once your whole budget plan is funded.",
    helperZero: "Every krona in your budget plan is already assigned next month.",
    helperNegative:
      "Your budget plan doesn't balance next month. Nothing is overspent — it's a plan, not actuals.",

    equationAria: "How next month is calculated",
    equationIncome: "Income",
    equationCarryOver: "Carry-over",
    equationExpenses: "Expenses",
    equationSavings: "Savings",
    equationDebts: "Debt payments",
    equationRemaining: "Free left",
    equationPlus: "+",
    equationMinus: "−",
    equationEquals: "=",

    allocationCaption: "Where next month goes",
    allocationAria: "Allocation of next month's money",
    allocationExpenses: "Expenses",
    allocationSavings: "Savings",
    allocationDebts: "Debts",
    allocationFree: "Free",
    allocationRunsOut: "Money runs out here",

    carryAssumption:
      "Based on {month} closing with {amount} left. Amounts are finalised when the month closes.",
    basisNote: "Projected from your budget plan with nothing changed.",

    comparisonKicker: "Compared with {month}",
    comparisonTitle: "Why {month} looks different",
    comparisonCount: "{count} changes",
    termsCount: "5 terms",
    comparisonNoChanges: "No material difference from the open month.",
    delta_income: "Income changes in next month's plan.",
    delta_carryOver: "Carry-over is still estimated.",
    delta_expenses: "Expenses differ from the open month.",
    delta_savings: "Savings differ from the open month.",
    delta_debts: "Debt payments differ from the open month.",

    lifecycleKicker: "How {month} becomes real",
    lifecyclePreviewTitle: "Preview",
    lifecyclePreviewBody: "Projected from your budget plan. Read-only, nothing saved.",
    lifecyclePlannedTitle: "Planned",
    lifecyclePlannedBody: "A real {month} you can adjust before it opens.",
    lifecycleOpenTitle: "Open",
    lifecycleOpenBody:
      "When you close {from}, {month} takes over and carry-over becomes final.",

    startPlanningKicker: "When you're ready",
    startPlanningTitle: "Start planning {month}",
    startPlanningBody:
      "Create a planned version of {month} so you can adjust it before {from} closes. {from} stays open.",
    startPlanningDeficitBody:
      "Right now {month} is short by {amount}. Create a planned version so you can adjust it before {from} closes. {from} stays open.",
    startStepCreate: "Creates a planned {month} from your budget plan",
    startStepAdjust:
      "Adjust income, expenses, savings and debts just for {month}",
    startStepOpen: "{month} stays open and closes later as usual",
    startPlanningAction: "Start planning next month",
    startPlanningPending: "Creating planned month",
    startPlanningRetry: "Try again",
    startPlanningError:
      "Couldn’t create the planned month. Please try again.",
    startPlanningSafeNote:
      "Nothing is moved. This only creates {month} for editing.",
    forwardNoteTitle: "Need this change every month?",
    forwardNoteBody:
      "Open the relevant editor and choose budget plan forward on the row you change. Closed months are never changed.",
    confirmClose: "Close",
    confirmTitle: "Create planned {month}?",
    confirmBody:
      "This creates an editable planned month from your budget plan. {from} stays open. Final carry-over is applied when {from} closes.",
    confirmCancel: "Not now",
    confirmPending: "Creating",
    confirmAction: "Create planned month",
    // success ribbon after the planned month is created — {month} interpolated
    plannedSuccessTitle: "{month} is planned",
    plannedSuccessBody: "You can now adjust the month before it opens.",
    plannedIntro:
      "This month is planned and can be edited before it becomes active.",
    editActionsKicker: "Plan the month",
    editActionsTitle: "Edit planned month",
    editNextMonthOnlyTitle: "Edit next month only",
    editNextMonthOnlyBody:
      "Opens the full editor for the planned month. Changes apply only to that month unless you choose a plan-forward scope in the editor.",
    updatePlanForwardTitle: "Update budget plan forward",
    updatePlanForwardBody:
      "The budget plan does not change here. Choose a plan-forward scope inside the editor only when the change should affect future months.",
    monthOnlyScope: "Applies only to {month}",
    planForwardScope: "Budget plan forward",
    editIncome: "Income",
    editExpenses: "Expenses",
    editSavings: "Savings",
    editDebts: "Debts",
    editRowMeta: "Opens full editor for planned month",
    editRowAction: "Open",

    unavailableTitle: "No preview yet",
    unavailableBody:
      "The next-month preview is available once you have an open month to project from.",

    emptyTitle: "No budget plan yet",
    emptyBody:
      "Add income and expenses to your budget plan to see a preview of next month.",

    errorTitle: "Couldn’t load the preview",
    errorFallback: "Please try again in a moment.",
  },

  et: {
    back: "Tagasi ülevaate juurde",

    kicker: "Järgmine kuu",
    previewBadge: "Eelvaade",
    previewNothingSaved: "Eelvaade — midagi pole salvestatud",
    plannedBadge: "Planeeritud",
    openBadge: "Avatud",
    titleSeparator: "·",
    intro:
      "See ei ole sinu aktiivne kuu. Nii näeb järgmine kuu välja, kui eelarveplaan ei muutu.",

    remainingLabel: "Vaba jaotamiseks",
    freeInMonth: "Vaba jaotamiseks kuus {month}",
    shortInMonth: "Puudujääk kuus {month}",
    fromBudgetPlan: "Eelarveplaanist",
    estimatedAbbr: "hinn.",
    toneWordPositive: "vaba jaotamiseks",
    toneWordZero: "kõik on jaotatud",
    toneWordNegative: "puudujääk",
    helperPositive:
      "Nii palju jääb järgmisel kuul vabaks, kui kogu eelarveplaan on rahastatud.",
    helperZero: "Iga eelarveplaani kroon on järgmiseks kuuks juba määratud.",
    helperNegative:
      "Eelarveplaan ei lähe järgmisel kuul tasa. Midagi ei ole üle kulutatud — see on plaan, mitte tegelik tulemus.",

    equationAria: "Kuidas järgmine kuu arvutatakse",
    equationIncome: "Sissetulekud",
    equationCarryOver: "Ülekanne",
    equationExpenses: "Kulud",
    equationSavings: "Sääst",
    equationDebts: "Võlamaksed",
    equationRemaining: "Vaba jääk",
    equationPlus: "+",
    equationMinus: "−",
    equationEquals: "=",

    allocationCaption: "Kuhu järgmine kuu läheb",
    allocationAria: "Järgmise kuu raha jaotus",
    allocationExpenses: "Kulud",
    allocationSavings: "Sääst",
    allocationDebts: "Võlad",
    allocationFree: "Vaba",
    allocationRunsOut: "Siin saab raha otsa",

    carryAssumption:
      "Põhineb sellel, et {month} suletakse jäägiga {amount}. Summad kinnitatakse kuu sulgemisel.",
    basisNote: "Projitseeritud sinu eelarveplaani põhjal, midagi muutmata.",

    comparisonKicker: "Võrreldes kuuga {month}",
    comparisonTitle: "Miks {month} näeb teistsugune välja",
    comparisonCount: "{count} muudatust",
    termsCount: "5 osa",
    comparisonNoChanges: "Avatud kuuga võrreldes suuri erinevusi pole.",
    delta_income: "Sissetulek muutub järgmise kuu plaanis.",
    delta_carryOver: "Ülekanne on veel hinnanguline.",
    delta_expenses: "Kulud erinevad avatud kuust.",
    delta_savings: "Sääst erineb avatud kuust.",
    delta_debts: "Võlamaksed erinevad avatud kuust.",

    lifecycleKicker: "Kuidas {month} päriselt avaneb",
    lifecyclePreviewTitle: "Eelvaade",
    lifecyclePreviewBody:
      "Projitseeritud eelarveplaanist. Ainult vaatamiseks, midagi pole salvestatud.",
    lifecyclePlannedTitle: "Planeeritud",
    lifecyclePlannedBody: "Päris {month}, mida saad enne avamist kohandada.",
    lifecycleOpenTitle: "Avatud",
    lifecycleOpenBody:
      "Kui {from} suletakse, võtab {month} üle ja ülekanne muutub lõplikuks.",

    startPlanningKicker: "Kui oled valmis",
    startPlanningTitle: "Alusta planeerimist: {month}",
    startPlanningBody:
      "Loo planeeritud versioon kuust {month}, et seda enne kuu {from} sulgemist kohandada. {from} jääb avatuks.",
    startPlanningDeficitBody:
      "{month} on praegu puudujäägis summaga {amount}. Loo planeeritud versioon, et seda enne kuu {from} sulgemist kohandada. {from} jääb avatuks.",
    startStepCreate: "Loob planeeritud kuu {month} sinu eelarveplaanist",
    startStepAdjust:
      "Kohanda sissetulekuid, kulusid, säästu ja võlgu ainult kuuks {month}",
    startStepOpen: "{month} jääb avatuks ja suletakse hiljem tavapäraselt",
    startPlanningAction: "Alusta järgmise kuu planeerimist",
    startPlanningPending: "Planeeritud kuu loomine",
    startPlanningRetry: "Proovi uuesti",
    startPlanningError:
      "Planeeritud kuu loomine ebaõnnestus. Proovi uuesti.",
    startPlanningSafeNote:
      "Midagi ei liigutata. See loob ainult kuu {month} redigeerimiseks.",
    forwardNoteTitle: "Kas muudatus peab kehtima iga kuu?",
    forwardNoteBody:
      "Ava õige redaktor ja vali muudetaval real eelarveplaan edasi. Suletud kuid ei muudeta kunagi.",
    confirmClose: "Sulge",
    confirmTitle: "Luua planeeritud {month}?",
    confirmBody:
      "See loob eelarveplaanist redigeeritava planeeritud kuu. {from} jääb avatuks. Lõplik ülekanne rakendatakse siis, kui {from} suletakse.",
    confirmCancel: "Mitte praegu",
    confirmPending: "Loomine",
    confirmAction: "Loo planeeritud kuu",
    // success ribbon after the planned month is created — {month} interpolated
    plannedSuccessTitle: "{month} on planeeritud",
    plannedSuccessBody: "Saad kuud nüüd enne avanemist kohandada.",
    plannedIntro:
      "See kuu on planeeritud ja seda saab enne aktiivseks muutumist muuta.",
    editActionsKicker: "Planeeri kuu",
    editActionsTitle: "Muuda planeeritud kuud",
    editNextMonthOnlyTitle: "Muuda ainult järgmist kuud",
    editNextMonthOnlyBody:
      "Avab täieliku redaktori planeeritud kuu jaoks. Muudatused kehtivad ainult sellele kuule, kui sa redaktoris ei vali plaani-edasi ulatust.",
    updatePlanForwardTitle: "Uuenda eelarveplaani edasi",
    updatePlanForwardBody:
      "Eelarveplaan siin ei muutu. Vali redaktoris plaani-edasi ulatus ainult siis, kui muudatus peab mõjutama tulevasi kuid.",
    monthOnlyScope: "Kehtib ainult kuule {month}",
    planForwardScope: "Eelarveplaan edasi",
    editIncome: "Sissetulekud",
    editExpenses: "Kulud",
    editSavings: "Sääst",
    editDebts: "Võlad",
    editRowMeta: "Avab planeeritud kuu täieliku redaktori",
    editRowAction: "Ava",

    unavailableTitle: "Eelvaadet veel pole",
    unavailableBody:
      "Järgmise kuu eelvaade on saadaval, kui sul on avatud kuu, millest projitseerida.",

    emptyTitle: "Eelarveplaani veel pole",
    emptyBody:
      "Lisa oma eelarveplaani sissetulekud ja kulud, et näha järgmise kuu eelvaadet.",

    errorTitle: "Eelvaadet ei õnnestunud laadida",
    errorFallback: "Proovi mõne aja pärast uuesti.",
  },
};
