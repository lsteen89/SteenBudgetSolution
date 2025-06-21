import { FieldValues } from 'react-hook-form';

export interface SavingsGoal {
  id?: string;
  name: string;
  amount: number | null;
}

export interface SavingsFormValues extends FieldValues {
  savingHabit: string;
  monthlySavings: number | null;
  savingMethod: string | null;
  goals: SavingsGoal[];
}
