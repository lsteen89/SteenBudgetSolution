export type GoalBase = {
    id: string;
    name: string;                 // required
    targetAmount: number | null;
    targetDate: string | null;    // store as "YYYY-MM-DD" or null
    amountSaved: number | null;
};
