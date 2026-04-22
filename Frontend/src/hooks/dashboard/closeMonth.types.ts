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

export type SurplusResolutionStatus =
  | "idle"
  | "resolvingEmergencyFund"
  | "resolvingCarryOver"
  | "resolvedEmergencyFund"
  | "resolvedCarryOver";

export type CloseMonthReviewItem = {
  id: string;
  label: string;
  amount: number;
  onEdit: () => void;
};

export type CloseMonthPendingOptions = {
  carryOverMode: "none" | "full";
};
