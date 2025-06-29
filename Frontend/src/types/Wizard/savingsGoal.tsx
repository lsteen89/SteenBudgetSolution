export interface SavingsGoal {
  id: string;
  name?: string;
  targetAmount: number | null;
  targetDate?: Date | null;
  amountSaved?: number | null;
}