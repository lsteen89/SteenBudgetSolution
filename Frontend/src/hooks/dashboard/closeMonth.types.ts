export type CloseMonthReviewStateId =
  | "balanced"
  | "positiveRemaining"
  | "negativeRemaining";

export type CloseMonthReviewState =
  | {
      state: "balanced";
      normalizedRemainingToSpend: number;
    }
  | {
      state: "positiveRemaining";
      normalizedRemainingToSpend: number;
    }
  | {
      state: "negativeRemaining";
      normalizedRemainingToSpend: number;
    };

export type CloseMonthCarryOverMode = "none" | "full";

export type CloseMonthSummary = {
  incomingCarryOver: number;
  income: number;
  expenses: number;
  savingsAndDebt: number;
  remaining: number;
};

export type CloseMonthPendingOptions = {
  carryOverMode: CloseMonthCarryOverMode;
};

// Transient handoff state surfaced after a successful month close. Lives only
// in memory: cleared on continue, dismiss, navigation away, or page reload.
export type JustClosedMonthState = {
  closedYearMonth: string;
  nextYearMonth: string;
  finalBalance: number;
  carryOverMode: CloseMonthCarryOverMode;
  carryOverAmount: number;
};
