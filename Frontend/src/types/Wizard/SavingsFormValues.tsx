export interface SavingsGoal {
    id: string; // Every goal needs a unique ID
    name: string;
    amount: number | null;
}


export interface SavingsFormValues {
    savingHabit: string;
    monthlySavings: number | null;
    savingMethods: string[]; 
    goals: SavingsGoal[];
}