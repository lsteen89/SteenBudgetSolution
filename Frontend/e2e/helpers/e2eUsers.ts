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
  closeSurplusFull: {
    email: "e2e-close-surplus-full@local.test",
    password: e2ePassword,
  },
  closeDeficit: {
    email: "e2e-close-deficit@local.test",
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
} as const;

export const e2eOpenYearMonth = "2026-04";
