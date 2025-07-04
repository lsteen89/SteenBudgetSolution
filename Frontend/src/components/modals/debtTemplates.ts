export type DebtTemplateName = 'Kreditkort' | 'Bolån' | 'Billån' | 'Privatlån' | 'Avbetalning';

export interface DebtTemplate {
  type: 'revolving' | 'bank_loan' | 'private' | 'installment';
  name: DebtTemplateName; // Använder din befintliga DebtTemplateName
  balance: number;
  apr: number;
  
  monthlyFee?: number;
  minPayment?: number;   
  termMonths?: number;  
}

// Debt templates for the modal selection
export const debtTemplates: DebtTemplate[] = [
  {
    name: 'Kreditkort',
    type: 'revolving', // A credit card is a revolving loan
    balance: 15000,
    apr: 19.5,
    minPayment: 500,
  },
  {
    name: 'Bolån',
    type: 'bank_loan', // A mortgage is a bank loan
    balance: 2500000,
    apr: 4.5,
    termMonths: 360, // 30 years
  },
  {
    name: 'Billån',
    type: 'bank_loan', // A car loan is also a bank loan
    balance: 120000,
    apr: 6.9,
    termMonths: 60, // 5 years
  },
  {
    name: 'Privatlån',
    type: 'private', // A loan from family/friends is private
    balance: 25000,
    apr: 0,
  },
  {
    name: 'Avbetalning', 
    type: 'installment',
    balance: 5000,
    apr: 0, 
    monthlyFee: 49,
    termMonths: 24,
  },
];