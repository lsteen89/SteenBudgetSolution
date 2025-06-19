import { FieldValues } from 'react-hook-form';

export interface SavingsGoal {
  id?: string;
  name: string;
  amount: number | null;
}

export interface SavingsFormValues extends FieldValues {
  currentSavings: number | null;
  goals: SavingsGoal[];
}
