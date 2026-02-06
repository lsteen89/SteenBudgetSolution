export interface FixedExpenseItem {
    id?: string;
    name?: string;
    cost?: number | null;
}

export interface FixedExpensesSubForm {
    insurance?: number | null;
    internet?: number | null;
    phone?: number | null;
    gym?: number | null;

    // Leaving these commented out for now
    //healthcare?: number | null;
    //childcare?: number | null;
    // custom (main capability)
    customExpenses?: (FixedExpenseItem | undefined)[];
}
