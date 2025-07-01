export interface DebtEntry {
  id: string;
  name?: string;
  amount: number | null;
}

export interface Step4FormValues {
  intro: {
    hasDebts: boolean | null;
  };
  info: {
    notes: string;
  };
  debts: DebtEntry[];
}
