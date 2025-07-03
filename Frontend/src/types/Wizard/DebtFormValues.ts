export interface DebtItem {
  id: string;
  type: 'installment' | 'revolving' | 'private'; 
  name: string;
  balance: number | null;
  apr: number | null;                  // annual %
  minPayment?: number | null;          // only for revolving
  termMonths?: number | null;          // only for installment
}

export interface DebtsIntro { hasDebts: boolean | null; }
export interface DebtsInfo  { notes: string; }

export interface DebtsFormValues {
  intro: DebtsIntro;
  info:  DebtsInfo;
  debts: DebtItem[];
}