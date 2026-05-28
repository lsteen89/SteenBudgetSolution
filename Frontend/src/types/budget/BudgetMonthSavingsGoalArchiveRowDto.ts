// Read-only projection of a closed savings goal as surfaced by the savings
// editor "previous goals" archive. The backend filters out removed and
// deleted rows server-side — the FE never has to skip them. Budget-scoped,
// so a goal completed in an earlier month still appears in later open
// months.
//
// `amountSavedAtClose` is the canonical display amount and is derived
// server-side: for `completed` goals it includes the closing-month
// contribution (close-month does NOT advance raw AmountSaved), for
// `cancelled` goals it equals what the user actually saved. The UI must
// not recompute this.
export type BudgetMonthSavingsGoalArchiveRowDto = {
  id: string;
  sourceSavingsGoalId: string | null;
  name: string;
  targetAmount: number | null;
  targetDate: string | null;
  amountSavedAtClose: number | null;
  monthlyContribution: number;
  status: string;
  closedReason: "completed" | "cancelled" | string;
  closedAt: string | null;
  isMonthOnly: boolean;
};
