export const expenseLedgerRowDict = {
  sv: {
    paused: "Pausad i {month}",
    cancelled: "Avslutad i {month}",
    inactive: "Inaktiv i {month}",
    onlyThisMonth: "Endast {month}",
    doesNotCount: "Räknas inte i månadens total",
    changedFromPlan: "Ändrad mot planen",
    // {amount} is pre-formatted (e.g. "300 kr"), no sign.
    deltaHigherThanPlan: "{amount} mer än planen",
    deltaLowerThanPlan: "{amount} mindre än planen",
  },
  en: {
    paused: "Paused in {month}",
    cancelled: "Ended in {month}",
    inactive: "Inactive in {month}",
    onlyThisMonth: "Only {month}",
    doesNotCount: "Doesn't count in this month's total",
    changedFromPlan: "Changed this month",
    deltaHigherThanPlan: "{amount} more than the plan",
    deltaLowerThanPlan: "{amount} less than the plan",
  },
  et: {
    paused: "Peatatud kuus {month}",
    cancelled: "Lõpetatud kuus {month}",
    inactive: "Mitteaktiivne kuus {month}",
    onlyThisMonth: "Ainult {month}",
    doesNotCount: "Ei loeta selle kuu kogusummasse",
    changedFromPlan: "Muudetud plaanist",
    deltaHigherThanPlan: "{amount} rohkem kui plaan",
    deltaLowerThanPlan: "{amount} vähem kui plaan",
  },
} as const;
