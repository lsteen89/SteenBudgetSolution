/**
 * i18n dictionary for the open-month dashboard planning row (PR3).
 *
 * The row teaches the budget model — This month → Next month → Budget plan —
 * through three compact cards, not prose. Copy rules:
 *  - User-facing budget language only. Banned: "default", "baseline",
 *    "source", "entity", "override".
 *  - No next-month money number unless the backend preview provides one; the
 *    Next-month card falls back to a factual state line otherwise.
 *  - The Budget plan card carries no action until a plan-editing route exists,
 *    so it never offers a dead link.
 */
export const planningRowDict = {
  sv: {
    sectionAria: "Planering: denna månad, nästa månad och budgetplan",

    // Card A — This month
    thisMonthKicker: "Denna månad",
    openBadge: "Öppen",
    freeNowWord: "fritt nu",
    shortWord: "underskott",
    seeAllocation: "Se fördelningen",

    // Card B — Next month
    nextMonthKicker: "Nästa månad",
    previewBadge: "Förhandsvisning",
    notOpenedBadge: "Inte öppnad",
    freeIfNothingChanges: "fritt, om inget ändras",
    shortIfNothingChanges: "underskott, om inget ändras",
    checkingPreview: "Hämtar förhandsvisning…",
    opensOnClose: "Öppnas när du stänger den här månaden.",
    reviewNextMonth: "Granska nästa månad",

    // Card C — Budget plan
    budgetPlanKicker: "Budgetplan",
    budgetPlanTitle: "Din vanliga plan",
    budgetPlanBody: "Det nya månader utgår från. Ändringar gäller framåt.",
  },

  en: {
    sectionAria: "Planning: this month, next month and budget plan",

    thisMonthKicker: "This month",
    openBadge: "Open",
    freeNowWord: "free now",
    shortWord: "short",
    seeAllocation: "See allocation",

    nextMonthKicker: "Next month",
    previewBadge: "Preview",
    notOpenedBadge: "Not opened",
    freeIfNothingChanges: "free, if nothing changes",
    shortIfNothingChanges: "short, if nothing changes",
    checkingPreview: "Loading preview…",
    opensOnClose: "Opens when you close this month.",
    reviewNextMonth: "Review next month",

    budgetPlanKicker: "Budget plan",
    budgetPlanTitle: "Your usual plan",
    budgetPlanBody: "The setup new months start from. Edits roll forward.",
  },

  et: {
    sectionAria: "Planeerimine: see kuu, järgmine kuu ja eelarveplaan",

    thisMonthKicker: "See kuu",
    openBadge: "Avatud",
    freeNowWord: "vaba nüüd",
    shortWord: "puudujääk",
    seeAllocation: "Vaata jaotust",

    nextMonthKicker: "Järgmine kuu",
    previewBadge: "Eelvaade",
    notOpenedBadge: "Pole avatud",
    freeIfNothingChanges: "vaba, kui midagi ei muutu",
    shortIfNothingChanges: "puudujääk, kui midagi ei muutu",
    checkingPreview: "Laadin eelvaadet…",
    opensOnClose: "Avaneb, kui sulged selle kuu.",
    reviewNextMonth: "Vaata järgmine kuu üle",

    budgetPlanKicker: "Eelarveplaan",
    budgetPlanTitle: "Sinu tavaline plaan",
    budgetPlanBody: "Sellest algavad uued kuud. Muudatused kehtivad edasi.",
  },
} as const;
