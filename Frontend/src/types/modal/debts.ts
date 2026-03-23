export type DebtTemplateId =
  | "credit_card"
  | "mortgage"
  | "car_loan"
  | "personal_loan"
  | "installment";
export type DebtTemplate = {
  id: DebtTemplateId;
  name: string;
  type: "revolving" | "bank_loan" | "private" | "installment";
  balance: number;
  apr: number;
  termMonths?: number | null;
  monthlyFee?: number | null;
  minPayment?: number | null;
};
