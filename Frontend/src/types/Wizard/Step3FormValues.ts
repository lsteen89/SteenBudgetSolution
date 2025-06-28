import { SavingsGoal, SavingsIntro, SavingHabits } from './SavingsFormValues';

export interface Step3FormValues {
    intro?: SavingsIntro;
    habits?: SavingHabits;
    goals?: SavingsGoal[];
}
