export type DebtTemplateName = 'Kreditkort' | 'Billån' | 'Privatlån';

export interface DebtTemplate {
  type: 'installment' | 'revolving' | 'private';
  name: DebtTemplateName;
  balance: number;
  apr: number;
  minPayment?: number;
  termMonths?: number;
}

export const debtTemplates: DebtTemplate[] = [
  {
    name: 'Kreditkort',
    type: 'revolving',
    balance: 15_000,
    apr: 18.9,
    minPayment: 500,
  },
  {
    name: 'Billån',
    type: 'installment',
    balance: 120_000,
    apr: 5.9,
    termMonths: 60,
  },
  {
  name: "Privatlån",
  type: "private",
  balance: 25000,
  apr: 0,
  },
];
