export const SAVING_METHODS = ["auto", "manual", "invest", "prefer_not"] as const;
export type SavingMethod = (typeof SAVING_METHODS)[number];

export interface SavingsGoal {
    id: string;
    name: string;
    targetAmount: number | null;
    targetDate: string | null;
    amountSaved: number | null;
}

export interface SavingsIntro {
    savingHabit: string;
}

export interface SavingHabits {
    monthlySavings: number | null;
    savingMethods: SavingMethod[];
}

export interface SavingsFormValues {
    intro: SavingsIntro;
    habits: SavingHabits;
    goals: SavingsGoal[];
}



