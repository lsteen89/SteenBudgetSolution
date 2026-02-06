export interface DebtItem {
  id: string;
  type: 'installment' | 'bank_loan' | 'private' | 'revolving';
  name: string;
  balance: number | null;
  apr: number | null;
  monthlyFee?: number | null;
  minPayment?: number | null;
  termMonths?: number | null;
}

export interface DebtsIntro {
  hasDebts: boolean | null;
}

export type RepaymentStrategy = "avalanche" | "snowball" | "noAction" | "unknown";

export interface DebtsSummary {
  repaymentStrategy: RepaymentStrategy;
}

export interface DebtsFormValues {
  intro: DebtsIntro;
  summary: DebtsSummary;
  debts: DebtItem[];
}