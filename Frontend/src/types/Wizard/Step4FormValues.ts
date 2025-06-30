export interface DebtEntry {
  id: string;
  name?: string;
  amount: number | null;
}

export interface Step4FormValues {
  info: {
    notes: string;
  };
  debts: DebtEntry[];
}
