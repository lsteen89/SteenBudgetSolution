export const expenseLedgerRowDict = {
  sv: {
    paused: "Pausad",
    cancelled: "Avstängd",
    inactive: "Inaktiverad",
    onlyThisMonth: "Bara denna månad",
    doesNotCount: "Räknas inte i månadens total",
    changedFromPlan: "Ändrad mot planen",
    // {amount} is pre-formatted (e.g. "300 kr"), no sign.
    deltaHigherThanPlan: "{amount} mer än planen",
    deltaLowerThanPlan: "{amount} mindre än planen",
  },
  en: {
    paused: "Paused",
    cancelled: "Cancelled",
    inactive: "Inactive",
    onlyThisMonth: "Only this month",
    doesNotCount: "Doesn't count in this month's total",
    changedFromPlan: "Changed this month",
    deltaHigherThanPlan: "{amount} more than the plan",
    deltaLowerThanPlan: "{amount} less than the plan",
  },
  et: {
    paused: "Peatatud",
    cancelled: "Lõpetatud",
    inactive: "Mitteaktiivne",
    onlyThisMonth: "Ainult sellel kuul",
    doesNotCount: "Ei loeta selle kuu kogusummasse",
    changedFromPlan: "Muudetud plaanist",
    deltaHigherThanPlan: "{amount} rohkem kui plaan",
    deltaLowerThanPlan: "{amount} vähem kui plaan",
  },
} as const;
