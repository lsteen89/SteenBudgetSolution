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
  closeSurplusFull: {
    email: "e2e-close-surplus-full@local.test",
    password: e2ePassword,
  },
  closeDeficit: {
    email: "e2e-close-deficit@local.test",
    password: e2ePassword,
  },
} as const;

export const e2eOpenYearMonth = "2026-04";
