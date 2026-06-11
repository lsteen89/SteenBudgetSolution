/**
 * i18n dictionary for the dashboard's next-month preview detail (PR3).
 *
 * The detail surface sits directly under the planning row and expands the
 * Next-month card's "≈ free" teaser into the comparison the standalone
 * blueprint shows: the projected free amount, what moves between the months
 * (delta chips), the carry-over assumption, and a per-term disclosure.
 *
 * Copy rules (same as PlanningRow):
 *  - User-facing budget language only. Banned: "default", "baseline",
 *    "source", "entity", "override".
 *  - Every number comes from the backend preview or the current dashboard;
 *    no copy may imply a computed or advisory projection.
 *  - Term labels mirror NextMonthPreviewPage.i18n.ts so the inline detail and
 *    the full preview page name the equation identically.
 */
export const nextMonthPreviewDetailDict = {
  sv: {
    sectionAria: "Förhandsvisning av nästa månad",
    kicker: "Förhandsvisning av nästa månad",
    previewBadge: "Förhandsvisning",
    openFullPreview: "Öppna hela förhandsvisningen",

    // hero — {month} is the localized next-month name
    freeInMonth: "fritt i {month}",
    shortInMonth: "underskott i {month}",
    zeroInMonth: "allt är fördelat i {month}",

    // carry-over assumption — {month} and {amount} are interpolated
    carryAssumption:
      "Bygger på att {month} stängs med {amount} kvar. Beloppen fastställs när månaden stängs.",

    // delta chips + disclosure
    deltasAria: "Det som ändras till nästa månad",
    diffTitle: "Så skiljer sig nästa månad",
    changesOne: "1 ändring",
    changesMany: "{count} ändringar",
    diffAria: "Jämförelse per post: denna månad mot nästa månad",
    termIncome: "Inkomster",
    termCarryOver: "Överfört",
    termExpenses: "Utgifter",
    termSavings: "Sparande",
    termDebts: "Skuldbetalningar",
  },

  en: {
    sectionAria: "Next month preview",
    kicker: "Next month preview",
    previewBadge: "Preview",
    openFullPreview: "Open full preview",

    freeInMonth: "free in {month}",
    shortInMonth: "short in {month}",
    zeroInMonth: "fully assigned in {month}",

    carryAssumption:
      "Based on {month} closing with {amount} left. Amounts are finalised when the month closes.",

    deltasAria: "What changes going into next month",
    diffTitle: "How next month differs",
    changesOne: "1 change",
    changesMany: "{count} changes",
    diffAria: "Per-term comparison: this month versus next month",
    termIncome: "Income",
    termCarryOver: "Carry-over",
    termExpenses: "Expenses",
    termSavings: "Savings",
    termDebts: "Debt payments",
  },

  et: {
    sectionAria: "Järgmise kuu eelvaade",
    kicker: "Järgmise kuu eelvaade",
    previewBadge: "Eelvaade",
    openFullPreview: "Ava täielik eelvaade",

    freeInMonth: "vaba kuus {month}",
    shortInMonth: "puudujääk kuus {month}",
    zeroInMonth: "kõik on jaotatud kuus {month}",

    carryAssumption:
      "Põhineb sellel, et {month} suletakse jäägiga {amount}. Summad kinnitatakse kuu sulgemisel.",

    deltasAria: "Mis muutub järgmiseks kuuks",
    diffTitle: "Kuidas järgmine kuu erineb",
    changesOne: "1 muudatus",
    changesMany: "{count} muudatust",
    diffAria: "Võrdlus kirjete kaupa: see kuu ja järgmine kuu",
    termIncome: "Sissetulekud",
    termCarryOver: "Ülekanne",
    termExpenses: "Kulud",
    termSavings: "Sääst",
    termDebts: "Võlamaksed",
  },
} as const;
