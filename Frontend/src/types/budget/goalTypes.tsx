// Type for a single savings goal
export type Goal = {
  id: string; // The backend ID, not the field array ID
  name: string;
  targetAmount: number | null;
  targetDate: string;
  amountSaved: number | null;
};

// Type for the entire form's values, used in react-hook-form
export type FormValues = {
  goals: Goal[];
};