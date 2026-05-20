// Server-computed proposal for a savings goal that could be marked completed
// when the user closes the month. `projectedAmountSaved` = `amountSaved` +
// `monthlyContribution` and is the value that qualified the goal — display it
// as the "would-reach this month" amount, never the raw `amountSaved`.
export type SavingsGoalCompletionCandidateDto = {
  id: string;
  sourceSavingsGoalId: string | null;
  name: string | null;
  targetAmount: number;
  amountSaved: number;
  monthlyContribution: number;
  projectedAmountSaved: number;
  remainingAfterContribution: number;
};
