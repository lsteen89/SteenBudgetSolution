export interface SavingsGoal {
  id: string;
  name?: string;
  targetAmount: number | null;
  targetDate?: string | null;
  amountSaved?: number | null;
}

export interface SavingsIntro {
    savingHabit: string;
}

export interface SavingHabits {
    monthlySavings: number | null;
    savingMethods: string[];
}

export interface SavingsFormValues {
    intro: SavingsIntro;
    habits: SavingHabits;
    goals: SavingsGoal[];
}



