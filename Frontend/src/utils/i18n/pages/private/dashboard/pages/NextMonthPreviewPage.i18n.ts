export const nextMonthPreviewDict = {
  sv: {
    back: "Tillbaka till översikten",

    // header
    kicker: "Nästa månad",
    previewBadge: "Förhandsvisning",
    // appended after the month label, e.g. "juni 2026 · Förhandsvisning"
    titleSeparator: "·",
    intro:
      "Det här är inte din aktiva månad. Så här ser nästa månad ut om budgetplanen inte ändras.",

    // money state
    remainingLabel: "Fritt att fördela",
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
    allocationUnfunded: "Saknar täckning",
    allocationRunsOut: "Här tar pengarna slut",

    // carry-over assumption — {month} and {amount} are interpolated
    carryAssumption:
      "Bygger på att {month} stängs med {amount} kvar. Beloppen fastställs när månaden stängs.",
    basisNote: "Projicerat från din budgetplan, utan att något ändrats.",

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
    titleSeparator: "·",
    intro:
      "This is not your active month. Here is what next month looks like if your budget plan doesn't change.",

    remainingLabel: "Free to allocate",
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
    allocationUnfunded: "Unfunded",
    allocationRunsOut: "Money runs out here",

    carryAssumption:
      "Based on {month} closing with {amount} left. Amounts are finalised when the month closes.",
    basisNote: "Projected from your budget plan with nothing changed.",

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
    titleSeparator: "·",
    intro:
      "See ei ole sinu aktiivne kuu. Nii näeb järgmine kuu välja, kui eelarveplaan ei muutu.",

    remainingLabel: "Vaba jaotamiseks",
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
    allocationUnfunded: "Katteta",
    allocationRunsOut: "Siin saab raha otsa",

    carryAssumption:
      "Põhineb sellel, et {month} suletakse jäägiga {amount}. Summad kinnitatakse kuu sulgemisel.",
    basisNote: "Projitseeritud sinu eelarveplaani põhjal, midagi muutmata.",

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
