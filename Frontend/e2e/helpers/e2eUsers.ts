export const e2ePassword = "ChangeMe123!";

export const e2eUsers = {
  login: {
    email: "e2e-login@local.test",
    password: e2ePassword,
  },
  closeBalanced: {
    email: "e2e-close-balanced@local.test",
    password: e2ePassword,
  },
  closeModalBalanced: {
    email: "e2e-close-modal-balanced@local.test",
    password: e2ePassword,
  },
  closeModalSurplusNone: {
    email: "e2e-close-modal-surplus-none@local.test",
    password: e2ePassword,
  },
  closeModalSurplusCarryover: {
    email: "e2e-close-modal-surplus-carryover@local.test",
    password: e2ePassword,
  },
  carryOverDashboard: {
    email: "e2e-carry-over-dashboard@local.test",
    password: e2ePassword,
  },
  closeModalDeficit: {
    email: "e2e-close-modal-deficit@local.test",
    password: e2ePassword,
  },
  closeSurplusFull: {
    email: "e2e-close-surplus-full@local.test",
    password: e2ePassword,
  },
  closeDeficit: {
    email: "e2e-close-deficit@local.test",
    password: e2ePassword,
  },
  // Dedicated, never-mutated open-month state fixtures for the DP5 dashboard
  // visual-polish suite (their open month stays a deficit / zero, unlike the
  // close* users whose months get closed by close-month specs).
  dashboardDeficit: {
    email: "e2e-dashboard-deficit@local.test",
    password: e2ePassword,
  },
  dashboardZero: {
    email: "e2e-dashboard-zero@local.test",
    password: e2ePassword,
  },
  recapSubscriptions: {
    email: "e2e-recap-subscriptions@local.test",
    password: e2ePassword,
  },
  recapSavingsDebt: {
    email: "e2e-recap-savings-debt@local.test",
    password: e2ePassword,
  },
  recapSankeyStress: {
    email: "e2e-recap-sankey-stress@local.test",
    password: e2ePassword,
  },
  recapFirstClosed: {
    email: "e2e-recap-first-closed@local.test",
    password: e2ePassword,
  },
  recapComparisonSkip: {
    email: "e2e-recap-comparison-skip@local.test",
    password: e2ePassword,
  },
  savingsEditor: {
    email: "e2e-savings-editor@local.test",
    password: e2ePassword,
  },
  savingsOrphan: {
    email: "e2e-savings-orphan@local.test",
    password: e2ePassword,
  },
  expensesEditor: {
    email: "e2e-expenses-editor@local.test",
    password: e2ePassword,
  },
  incomeEditor: {
    email: "e2e-income-editor@local.test",
    password: e2ePassword,
  },
  debtEditor: {
    email: "e2e-debt-editor@local.test",
    password: e2ePassword,
  },
  // Dedicated, mutating fixture for the next-month preview -> plan smoke. Its
  // open 2026-04 month carries a non-empty budget plan and no 2026-05 month,
  // so the page starts in "preview" and the spec materialises the planned
  // month without colliding with any other suite.
  nextMonthPlan: {
    email: "e2e-next-month-plan@local.test",
    password: e2ePassword,
  },
} as const;

export const e2eOpenYearMonth = "2026-04";
