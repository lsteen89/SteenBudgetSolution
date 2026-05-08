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
